-- ================= RPCs =================

-- 1. Save Exam Atomic V2 (Latest Version)
-- Handles Fractional Indexing, Is Exam Question, and Nullable Exam ID
CREATE OR REPLACE FUNCTION public.save_exam_atomic_v2(
  p_exam_id UUID,
  p_org_id UUID,
  p_exam_data JSONB, 
  p_segments_upsert JSONB, 
  p_segments_delete UUID[],
  p_questions_upsert JSONB, 
  p_questions_delete UUID[],
  p_groups_upsert UUID[]
) RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_final_exam_id UUID := p_exam_id;
  v_user_id UUID := auth.uid();
BEGIN
  -- 1. Authorization Check (Manual RLS)
  IF NOT public.is_org_member_above_student(p_org_id) THEN
    RAISE EXCEPTION 'Unauthorized: Insufficient organization privileges';
  END IF;

  -- 2. Determine if Update or Insert (Server-Side ID Validation)
  IF v_final_exam_id IS NOT NULL THEN
    SELECT id INTO v_final_exam_id 
    FROM public.exams 
    WHERE id = p_exam_id AND organization_id = p_org_id;
  END IF;

  -- 3. Upsert Exam
  IF v_final_exam_id IS NULL THEN
    INSERT INTO public.exams (
      organization_id, title, description, duration, is_active, 
      pass_threshold_type, pass_threshold_value, access_control_type, 
      allowed_attempts, start_time, end_time, created_by
    )
    VALUES (
      p_org_id,
      p_exam_data->>'title',
      p_exam_data->>'description',
      COALESCE((p_exam_data->>'duration')::INTEGER, 0),
      COALESCE((p_exam_data->>'is_active')::BOOLEAN, false),
      p_exam_data->>'pass_threshold_type',
      (p_exam_data->>'pass_threshold_value')::NUMERIC,
      COALESCE(p_exam_data->>'access_control_type', 'public'),
      COALESCE((p_exam_data->>'allowed_attempts')::INTEGER, 1),
      (p_exam_data->>'start_time')::TIMESTAMPTZ,
      (p_exam_data->>'end_time')::TIMESTAMPTZ,
      v_user_id
    ) RETURNING id INTO v_final_exam_id;
  ELSIF p_exam_data IS NOT NULL AND jsonb_typeof(p_exam_data) = 'object' AND p_exam_data <> '{}'::jsonb THEN
    UPDATE public.exams 
    SET 
      title = COALESCE(p_exam_data->>'title', title),
      description = COALESCE(p_exam_data->>'description', description),
      duration = COALESCE((p_exam_data->>'duration')::INTEGER, duration),
      is_active = COALESCE((p_exam_data->>'is_active')::BOOLEAN, is_active),
      pass_threshold_type = COALESCE(p_exam_data->>'pass_threshold_type', pass_threshold_type),
      pass_threshold_value = COALESCE((p_exam_data->>'pass_threshold_value')::NUMERIC, pass_threshold_value),
      access_control_type = COALESCE(p_exam_data->>'access_control_type', access_control_type),
      allowed_attempts = COALESCE((p_exam_data->>'allowed_attempts')::INTEGER, allowed_attempts),
      start_time = COALESCE((p_exam_data->>'start_time')::TIMESTAMPTZ, start_time),
      end_time = COALESCE((p_exam_data->>'end_time')::TIMESTAMPTZ, end_time),
      updated_at = NOW()
    WHERE id = v_final_exam_id;
  END IF;

  -- 4. Sync Groups
  IF p_groups_upsert IS NOT NULL THEN
    DELETE FROM public.exam_groups WHERE exam_id = v_final_exam_id;
    INSERT INTO public.exam_groups (exam_id, group_id)
    SELECT v_final_exam_id, gid FROM unnest(p_groups_upsert) AS gid;
  END IF;

  -- 5. Delete Segments & Questions
  IF array_length(p_segments_delete, 1) > 0 THEN
    DELETE FROM public.exam_segments WHERE id = ANY(p_segments_delete) AND exam_id = v_final_exam_id;
  END IF;
  IF array_length(p_questions_delete, 1) > 0 THEN
    DELETE FROM public.questions WHERE id = ANY(p_questions_delete) AND organization_id = p_org_id;
  END IF;

  -- 6. Batch Upsert Segments
  IF jsonb_array_length(p_segments_upsert) > 0 THEN
    UPDATE public.exam_segments s
    SET 
        name = COALESCE(val->>'name', s.name),
        order_index = COALESCE(val->>'order_index', s.order_index),
        requires_individual_pass = COALESCE((val->>'requires_individual_pass')::BOOLEAN, s.requires_individual_pass),
        pass_threshold_type = COALESCE(val->>'pass_threshold_type', s.pass_threshold_type),
        pass_threshold_value = COALESCE((val->>'pass_threshold_value')::NUMERIC, s.pass_threshold_value)
    FROM jsonb_array_elements(p_segments_upsert) AS val
    WHERE s.id = (val->>'id')::UUID;

    INSERT INTO public.exam_segments (
        id, exam_id, name, order_index, requires_individual_pass, 
        pass_threshold_type, pass_threshold_value
    )
    SELECT 
        (val->>'id')::UUID,
        v_final_exam_id,
        val->>'name',
        val->>'order_index',
        COALESCE((val->>'requires_individual_pass')::BOOLEAN, false),
        val->>'pass_threshold_type',
        COALESCE((val->>'pass_threshold_value')::NUMERIC, 0)
    FROM jsonb_array_elements(p_segments_upsert) AS val
    WHERE NOT EXISTS (
        SELECT 1 FROM public.exam_segments WHERE id = (val->>'id')::UUID
    )
    AND val->>'name' IS NOT NULL AND val->>'order_index' IS NOT NULL;
  END IF;

  -- 7. Batch Upsert Questions
  IF jsonb_array_length(p_questions_upsert) > 0 THEN
    UPDATE public.questions q
    SET 
        segment_id = COALESCE((val->>'segment_id')::UUID, q.segment_id),
        subject_id = COALESCE((val->>'subject_id')::UUID, q.subject_id),
        question_text = COALESCE(val->>'question_text', q.question_text),
        question_type = COALESCE(val->>'question_type', q.question_type),
        options = COALESCE(val->'options', q.options),
        correct_answer = COALESCE(val->>'correct_answer', q.correct_answer),
        marks = COALESCE((val->>'marks')::NUMERIC, q.marks),
        negative_marks = COALESCE((val->>'negative_marks')::NUMERIC, q.negative_marks),
        correct_feedback = COALESCE(val->>'correct_feedback', q.correct_feedback),
        incorrect_feedback = COALESCE(val->>'incorrect_feedback', q.incorrect_feedback),
        order_index = COALESCE(val->>'order_index', q.order_index),
        updated_at = NOW()
    FROM jsonb_array_elements(p_questions_upsert) AS val
    WHERE q.id = (val->>'id')::UUID
    AND q.exam_id = v_final_exam_id;

    INSERT INTO public.questions (
        id, organization_id, exam_id, segment_id, subject_id, 
        question_text, question_type, options, correct_answer, 
        marks, negative_marks, correct_feedback, incorrect_feedback, 
        order_index, is_exam_question
    )
    SELECT 
        (val->>'id')::UUID,
        p_org_id,
        v_final_exam_id,
        (val->>'segment_id')::UUID,
        (val->>'subject_id')::UUID,
        val->>'question_text',
        COALESCE(val->>'question_type', 'mcq'),
        val->'options',
        val->>'correct_answer',
        (val->>'marks')::NUMERIC,
        COALESCE((val->>'negative_marks')::NUMERIC, 0),
        val->>'correct_feedback',
        val->>'incorrect_feedback',
        COALESCE(val->>'order_index', 'a0'),
        TRUE
    FROM jsonb_array_elements(p_questions_upsert) AS val
    WHERE NOT EXISTS (
        SELECT 1 FROM public.questions WHERE id = (val->>'id')::UUID
    )
    AND val->>'question_text' IS NOT NULL 
    AND val->>'correct_answer' IS NOT NULL
    AND val->>'marks' IS NOT NULL;
  END IF;

  RETURN jsonb_build_object('success', true, 'exam_id', v_final_exam_id);
END;
$$;

-- 2. Grade Submission RPC
CREATE OR REPLACE FUNCTION public.grade_submission(p_submission_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission RECORD;
  v_exam RECORD;
  v_question RECORD;
  v_answer RECORD;
  v_total_score NUMERIC := 0;
  v_max_score NUMERIC := 0;
  v_total_correct INTEGER := 0;
  v_total_incorrect INTEGER := 0;
  v_total_skipped INTEGER := 0;
  v_total_answered INTEGER := 0;
  v_is_passed BOOLEAN := TRUE;
  v_seg RECORD;
  v_seg_score NUMERIC;
  v_seg_max NUMERIC;
  v_seg_correct INTEGER;
  v_seg_incorrect INTEGER;
  v_seg_skipped INTEGER;
  v_seg_answered INTEGER;
  v_seg_passed BOOLEAN;
  v_marks_awarded NUMERIC;
  v_is_correct BOOLEAN;
BEGIN
  -- 1. Fetch submission and exam
  SELECT * INTO v_submission FROM public.submissions WHERE id = p_submission_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Submission not found');
  END IF;

  SELECT * INTO v_exam FROM public.exams WHERE id = v_submission.exam_id;

  -- 2. Delete existing segment scores to recalculate
  DELETE FROM public.segment_scores WHERE submission_id = p_submission_id;

  -- 3. Loop through segments
  FOR v_seg IN SELECT * FROM public.exam_segments WHERE exam_id = v_exam.id ORDER BY order_index LOOP
    v_seg_score := 0;
    v_seg_max := 0;
    v_seg_correct := 0;
    v_seg_incorrect := 0;
    v_seg_skipped := 0;
    v_seg_answered := 0;

    -- Loop through questions in this segment
    FOR v_question IN SELECT * FROM public.questions WHERE segment_id = v_seg.id LOOP
      v_seg_max := v_seg_max + v_question.marks;
      
      -- Find student's answer
      SELECT * INTO v_answer FROM public.answers WHERE submission_id = p_submission_id AND question_id = v_question.id;
      
      IF v_answer IS NOT NULL AND v_answer.answer_text IS NOT NULL AND v_answer.answer_text <> '' THEN
        v_seg_answered := v_seg_answered + 1;
        v_is_correct := (lower(trim(v_answer.answer_text)) = lower(trim(v_question.correct_answer)));
        
        IF v_is_correct THEN
          v_marks_awarded := v_question.marks;
          v_seg_correct := v_seg_correct + 1;
        ELSE
          v_marks_awarded := CASE WHEN v_exam.has_negative_marking THEN -COALESCE(v_question.negative_marks, v_exam.negative_marks_value) ELSE 0 END;
          v_seg_incorrect := v_seg_incorrect + 1;
        END IF;
        
        -- Update answer record
        UPDATE public.answers SET is_correct = v_is_correct, marks_awarded = v_marks_awarded, is_marked = true WHERE id = v_answer.id;
        v_seg_score := v_seg_score + v_marks_awarded;
      ELSE
        v_seg_skipped := v_seg_skipped + 1;
        UPDATE public.answers SET is_correct = false, marks_awarded = 0, is_marked = true WHERE id = v_answer.id;
      END IF;
    END LOOP;

    -- Determine if segment passed
    v_seg_passed := TRUE;
    IF v_seg.requires_individual_pass AND v_seg.pass_threshold_type <> 'none' THEN
      IF v_seg.pass_threshold_type = 'fixed' THEN
        v_seg_passed := (v_seg_score >= v_seg.pass_threshold_value);
      ELSIF v_seg.pass_threshold_type = 'percentile' THEN
        v_seg_passed := (v_seg_max > 0 AND (v_seg_score / v_seg_max * 100) >= v_seg.pass_threshold_value);
      END IF;
    END IF;

    -- Insert segment score
    INSERT INTO public.segment_scores (
      submission_id, segment_id, score, max_score, percentage, passed, 
      total_questions, answered, correct, incorrect, skipped
    ) VALUES (
      p_submission_id, v_seg.id, v_seg_score, v_seg_max, 
      CASE WHEN v_seg_max > 0 THEN (v_seg_score / v_seg_max * 100) ELSE 0 END,
      v_seg_passed, (v_seg_correct + v_seg_incorrect + v_seg_skipped),
      v_seg_answered, v_seg_correct, v_seg_incorrect, v_seg_skipped
    );

    v_total_score := v_total_score + v_seg_score;
    v_max_score := v_max_score + v_seg_max;
    v_total_correct := v_total_correct + v_seg_correct;
    v_total_incorrect := v_total_incorrect + v_seg_incorrect;
    v_total_skipped := v_total_skipped + v_seg_skipped;
    v_total_answered := v_total_answered + v_seg_answered;
    
    IF NOT v_seg_passed THEN
      v_is_passed := FALSE;
    END IF;
  END LOOP;

  -- Overall Pass Check
  IF v_exam.pass_threshold_type <> 'none' AND v_is_passed THEN
    IF v_exam.pass_threshold_type = 'fixed' THEN
      v_is_passed := (v_total_score >= v_exam.pass_threshold_value);
    ELSIF v_exam.pass_threshold_type = 'percentile' THEN
      v_is_passed := (v_max_score > 0 AND (v_total_score / v_max_score * 100) >= v_exam.pass_threshold_value);
    END IF;
  END IF;

  -- Update submission
  UPDATE public.submissions SET
    total_score = v_total_score,
    max_score = v_max_score,
    percentage = CASE WHEN v_max_score > 0 THEN (v_total_score / v_max_score * 100) ELSE 0 END,
    passed = v_is_passed,
    is_graded = true,
    graded_at = NOW()
  WHERE id = p_submission_id;

  RETURN jsonb_build_object(
    'success', true, 
    'total_score', v_total_score, 
    'max_score', v_max_score, 
    'passed', v_is_passed
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_public_exam_meta(p_exam_id UUID)
RETURNS JSONB 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', id,
        'title', title,
        'description', description,
        'duration', duration,
        'questionCount', (SELECT COUNT(*) FROM questions WHERE exam_id = p_exam_id),
        'is_active', is_active,
        'end_time', end_time
    ) INTO v_result 
    FROM exams 
    WHERE id = p_exam_id;

    -- If not found at all
    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Exam not found';
    END IF;

    -- Logic Check: If ended or inactive, return a specific "Access" error
    -- This will be cached, which is fine because the Webhook will kill this cache 
    -- the moment the teacher fixes the time or publishes it.
    IF (v_result->>'is_active')::BOOLEAN = FALSE THEN
        RAISE EXCEPTION 'Exam is not yet published';
    END IF;

    IF v_result->>'end_time' IS NOT NULL AND NOW() > (v_result->>'end_time')::TIMESTAMPTZ THEN
        RAISE EXCEPTION 'This exam has already ended';
    END IF;

    RETURN v_result;
END;
$$;


CREATE OR REPLACE FUNCTION check_exam_access(exam_uuid UUID, student_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE 
    v_exam_record RECORD;
BEGIN
    -- Get the exam config once
    SELECT organization_id, access_control_type INTO v_exam_record 
    FROM public.exams WHERE id = exam_uuid;

    IF NOT FOUND THEN RETURN FALSE; END IF;

    -- 1. Public Check
    IF v_exam_record.access_control_type = 'public' THEN 
        RETURN TRUE;
    END IF;

    -- 2. Master Key Check (Staff)
    -- Teachers/Managers must ALWAYS get in, regardless of the policy below.
    IF EXISTS (
        SELECT 1 FROM public.memberships
        WHERE user_id = student_uuid
          AND organization_id = v_exam_record.organization_id
          AND member_role IN ('primary_owner', 'manager', 'teacher')
    ) THEN 
        RETURN TRUE; 
    END IF;

    -- 3. Policy: All in Organization
    IF v_exam_record.access_control_type = 'all_in_organization' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.memberships
            WHERE user_id = student_uuid
              AND organization_id = v_exam_record.organization_id
        );
    END IF;

    -- 4. Policy: Group-based
    IF v_exam_record.access_control_type = 'group_based' THEN
        IF EXISTS (
            SELECT 1 FROM public.exam_groups eg
            JOIN public.group_members gm ON eg.group_id = gm.group_id
            WHERE eg.exam_id = exam_uuid
              AND gm.user_id = student_uuid
        ) THEN 
            RETURN TRUE; 
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION start_or_resume_logic_only(p_exam_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_student_id UUID := auth.uid();
    v_exam RECORD;
    v_active_sub RECORD;
    v_submitted_count INT;
    v_previous_answers JSONB;
    v_grace_period INTERVAL := '3 minutes';
    v_is_resumed BOOLEAN := FALSE;
BEGIN
    -- 1. Identity Check
    IF v_student_id IS NULL THEN 
        RAISE EXCEPTION 'Unauthorized: Login required'; 
    END IF;

    -- 2. Meta & Security Check
    SELECT id, is_active, access_control_type, organization_id, start_time, end_time, allowed_attempts, duration
    INTO v_exam FROM public.exams WHERE id = p_exam_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Exam not found'; END IF;
    IF NOT v_exam.is_active THEN RAISE EXCEPTION 'Exam is not published'; END IF;

    -- Internal Call to your existing access function
    IF NOT (SELECT check_exam_access(p_exam_id, v_student_id)) THEN 
        RAISE EXCEPTION 'Access Denied'; 
    END IF;

    -- 3. Timing
    IF v_exam.start_time IS NOT NULL AND now() < v_exam.start_time THEN 
        RAISE EXCEPTION 'Exam hasn''t started yet'; 
    END IF;
    IF v_exam.end_time IS NOT NULL AND now() > v_exam.end_time THEN 
        RAISE EXCEPTION 'Exam has already ended'; 
    END IF;

    -- 4. Resume or Create Logic
    SELECT id, started_at INTO v_active_sub 
    FROM public.submissions 
    WHERE exam_id = p_exam_id AND student_id = v_student_id 
      AND (started_at + (v_exam.duration * interval '1 minute') + v_grace_period) > now()
    ORDER BY started_at DESC LIMIT 1;

    IF v_active_sub.id IS NULL THEN
        SELECT count(*)::int INTO v_submitted_count FROM public.submissions 
        WHERE exam_id = p_exam_id AND student_id = v_student_id;

        IF v_submitted_count >= COALESCE(v_exam.allowed_attempts, 1) THEN
            RAISE EXCEPTION 'Max attempts reached';
        END IF;

        INSERT INTO public.submissions (exam_id, student_id, started_at)
        VALUES (p_exam_id, v_student_id, now())
        RETURNING id, started_at INTO v_active_sub;
    END IF;

    -- 5. Fetch Previous Answers (Small JSON)
    SELECT jsonb_object_agg(question_id, 
        jsonb_build_object('answer_text', answer_text, 'is_marked', is_marked)
    ) INTO v_previous_answers
    FROM public.answers WHERE submission_id = v_active_sub.id;

    RETURN jsonb_build_object(
        'submissionId', v_active_sub.id,
        'startTime', v_active_sub.started_at,
        'previousAnswers', COALESCE(v_previous_answers, '{}'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION get_exam_content_bundle(p_exam_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_questions JSONB;
    v_segments JSONB;
BEGIN
    -- Assemble Questions
    SELECT jsonb_agg(q) INTO v_questions FROM (
        SELECT id, question_text, question_type, options, marks, segment_id, order_index
        FROM public.questions 
        WHERE exam_id = p_exam_id 
        ORDER BY order_index ASC
    ) q;

    -- Assemble Segments
    SELECT jsonb_agg(s) INTO v_segments FROM (
        SELECT id, name, order_index 
        FROM public.exam_segments 
        WHERE exam_id = p_exam_id 
        ORDER BY order_index ASC
    ) s;

    RETURN jsonb_build_object(
        'questions', COALESCE(v_questions, '[]'::jsonb),
        'segments', COALESCE(v_segments, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;