CREATE OR REPLACE FUNCTION public.grade_submission(p_submission_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
  v_overall_score NUMERIC := 0;
  v_overall_max NUMERIC := 0;
  v_overall_correct INTEGER := 0;
  v_overall_incorrect INTEGER := 0;
  v_overall_answered INTEGER := 0;
  v_overall_skipped INTEGER := 0;
  v_overall_passed BOOLEAN := TRUE;
  
  v_seg_json JSONB := '[]'::JSONB;
  v_seg RECORD;
  v_seg_passed BOOLEAN;
BEGIN
  -- 1. LOCK AND LOAD: Fetch Submission & Exam Config
  -- We use a join here to get marking rules (negative marks, pass thresholds)
  SELECT 
    s.id, s.exam_id, 
    e.pass_threshold_type, e.pass_threshold_value, 
    e.has_negative_marking, e.negative_marks_value
  INTO v_sub
  FROM public.submissions s
  JOIN public.exams e ON s.exam_id = e.id
  WHERE s.id = p_submission_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission record not found.');
  END IF;

  -- 2. BULK GRADE ANSWERS: Stop looping like a junior dev.
  -- This one query marks every single MCQ in the submission.
  UPDATE public.answers a
  SET 
    is_marked = true,
    is_correct = (lower(trim(a.answer_text)) = lower(trim(q.correct_answer))),
    marks_awarded = CASE
      -- Correct Answer
      WHEN lower(trim(a.answer_text)) = lower(trim(q.correct_answer)) THEN q.marks
      -- Skipped (No penalty)
      WHEN a.answer_text IS NULL OR trim(a.answer_text) = '' THEN 0
      -- Incorrect (Apply negative marking if enabled)
      ELSE (CASE WHEN v_sub.has_negative_marking THEN -COALESCE(q.negative_marks, v_sub.negative_marks_value) ELSE 0 END)
    END
  FROM public.questions q
  WHERE a.question_id = q.id 
    AND a.submission_id = p_submission_id;

  -- 3. SEGMENT RECALCULATION
  -- Wipe old scores for this submission to ensure idempotency.
  DELETE FROM public.segment_scores WHERE submission_id = p_submission_id;

  -- Loop through segments to calculate individual pass/fail status
  FOR v_seg IN 
    SELECT 
      es.id AS segment_id,
      es.name,
      es.requires_individual_pass,
      es.pass_threshold_type,
      es.pass_threshold_value,
      COALESCE(SUM(q.marks), 0) AS seg_max,
      COALESCE(SUM(a.marks_awarded), 0) AS seg_score,
      COUNT(q.id) AS total_q,
      COUNT(q.id) FILTER (WHERE a.answer_text IS NOT NULL AND trim(a.answer_text) <> '') AS answered,
      COUNT(q.id) FILTER (WHERE a.is_correct = true) AS correct,
      COUNT(q.id) FILTER (WHERE a.is_correct = false AND a.answer_text IS NOT NULL AND trim(a.answer_text) <> '') AS incorrect
    FROM public.exam_segments es
    JOIN public.questions q ON q.segment_id = es.id
    LEFT JOIN public.answers a ON a.question_id = q.id AND a.submission_id = p_submission_id
    WHERE es.exam_id = v_sub.exam_id
    GROUP BY es.id, es.name, es.requires_individual_pass, es.pass_threshold_type, es.pass_threshold_value
  LOOP
    -- Calculate Segment Pass
    v_seg_passed := TRUE;
    IF v_seg.requires_individual_pass AND v_seg.pass_threshold_type <> 'none' THEN
      IF v_seg.pass_threshold_type = 'fixed' THEN
        v_seg_passed := (v_seg.seg_score >= v_seg.pass_threshold_value);
      ELSIF v_seg.pass_threshold_type = 'percent' THEN
        v_seg_passed := (v_seg.seg_max > 0 AND (v_seg.seg_score / v_seg.seg_max * 100) >= v_seg.pass_threshold_value);
      END IF;
    END IF;

    -- Update Global Accumulators
    v_overall_score := v_overall_score + v_seg.seg_score;
    v_overall_max := v_overall_max + v_seg.seg_max;
    v_overall_correct := v_overall_correct + v_seg.correct;
    v_overall_incorrect := v_overall_incorrect + v_seg.incorrect;
    v_overall_answered := v_overall_answered + v_seg.answered;
    v_overall_skipped := v_overall_skipped + (v_seg.total_q - v_seg.answered);
    
    IF NOT v_seg_passed THEN v_overall_passed := FALSE; END IF;

    -- Store Segment Result
    INSERT INTO public.segment_scores (
      submission_id, segment_id, score, max_score, percentage, passed, 
      total_questions, answered, correct, incorrect, skipped
    ) VALUES (
      p_submission_id, v_seg.segment_id, v_seg.seg_score, v_seg.seg_max, 
      CASE WHEN v_seg.seg_max > 0 THEN (v_seg.seg_score / v_seg.seg_max * 100) ELSE 0 END,
      v_seg_passed, v_seg.total_q, v_seg.answered, v_seg.correct, v_seg.incorrect, (v_seg.total_q - v_seg.answered)
    );

    -- Build JSON for the return
    v_seg_json := v_seg_json || jsonb_build_object(
      'segment_id', v_seg.segment_id,
      'name', v_seg.name,
      'passed', v_seg_passed,
      'score', v_seg.seg_score,
      'max_score', v_seg.seg_max,
      'correct', v_seg.correct,
      'incorrect', v_seg.incorrect,
      'answered', v_seg.answered,
      'skipped', (v_seg.total_q - v_seg.answered)
    );
  END LOOP;

  -- 4. OVERALL PASS CHECK
  IF v_sub.pass_threshold_type <> 'none' AND v_overall_passed THEN
    IF v_sub.pass_threshold_type = 'fixed' THEN
      v_overall_passed := (v_overall_score >= v_sub.pass_threshold_value);
    ELSIF v_sub.pass_threshold_type = 'percent' THEN
      v_overall_passed := (v_overall_max > 0 AND (v_overall_score / v_overall_max * 100) >= v_sub.pass_threshold_value);
    END IF;
  END IF;

  -- 5. FINAL SUBMISSION UPDATE
  UPDATE public.submissions SET
    total_score = v_overall_score,
    max_score = v_overall_max,
    percentage = CASE WHEN v_overall_max > 0 THEN (v_overall_score / v_overall_max * 100) ELSE 0 END,
    passed = v_overall_passed,
    is_graded = true,
    graded_at = NOW()
  WHERE id = p_submission_id;

  -- 6. RETURN THE GOLD
  RETURN jsonb_build_object(
    'success', true, 
    'overall', jsonb_build_object(
      'passed', v_overall_passed,
      'total_score', v_overall_score, 
      'max_score', v_overall_max, 
      'total_correct', v_overall_correct,
      'total_incorrect', v_overall_incorrect,
      'total_answered', v_overall_answered,
      'total_skipped', v_overall_skipped
    ),
    'segments', v_seg_json
  );
END;
$$;