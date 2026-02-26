CREATE OR REPLACE FUNCTION public.save_exam_atomic(
  p_exam_id UUID,
  p_org_id UUID,
  p_exam_data JSONB, 
  p_segments_upsert JSONB, 
  p_segments_delete UUID[],
  p_questions_upsert JSONB, 
  p_questions_delete UUID[],
  p_batches_upsert UUID[]
) RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_final_exam_id UUID := p_exam_id;
  v_user_id UUID := auth.uid();
  v_creator_membership_id UUID;
BEGIN
  -- 1. Authorization & Membership Check
  -- We need the membership ID of the creator for the 'created_by' column
  SELECT id INTO v_creator_membership_id 
  FROM public.memberships 
  WHERE user_id = v_user_id AND organization_id = p_org_id;

  IF v_creator_membership_id IS NULL OR NOT public.is_org_staff(p_org_id) THEN
    RAISE EXCEPTION 'Unauthorized: User is not a staff member of this organization';
  END IF;

  -- 2. Upsert Exam Logic
  IF v_final_exam_id IS NULL THEN
    INSERT INTO public.exams (
      organization_id, title, description, duration, 
      start_time, end_time, created_by,
      is_published, pass_threshold_type, pass_threshold_value,
      has_negative_marking, negative_marks_value,
      allowed_attempts, allow_type, allow_instant_result,
      result_scheduled_at
    )
    VALUES (
      p_org_id,
      p_exam_data->>'title',
      p_exam_data->>'description',
      COALESCE((p_exam_data->>'duration')::INTEGER, 0),
      (p_exam_data->>'start_time')::TIMESTAMPTZ,
      (p_exam_data->>'end_time')::TIMESTAMPTZ,
      v_creator_membership_id,
      COALESCE((p_exam_data->>'is_published')::BOOLEAN, FALSE),
      p_exam_data->>'pass_threshold_type',
      (p_exam_data->>'pass_threshold_value')::NUMERIC,
      COALESCE((p_exam_data->>'has_negative_marking')::BOOLEAN, FALSE),
      COALESCE((p_exam_data->>'negative_marks_value')::NUMERIC, 0),
      COALESCE((p_exam_data->>'allowed_attempts')::INTEGER, 1),
      COALESCE(p_exam_data->>'allow_type', 'public'),
      COALESCE((p_exam_data->>'allow_instant_result')::BOOLEAN, FALSE),
      (p_exam_data->>'result_scheduled_at')::TIMESTAMPTZ
    ) RETURNING id INTO v_final_exam_id;
  ELSE
    UPDATE public.exams 
    SET 
      title = COALESCE(p_exam_data->>'title', title),
      description = COALESCE(p_exam_data->>'description', description),
      duration = COALESCE((p_exam_data->>'duration')::INTEGER, duration),
      start_time = (p_exam_data->>'start_time')::TIMESTAMPTZ,
      end_time = (p_exam_data->>'end_time')::TIMESTAMPTZ,
      is_published = COALESCE((p_exam_data->>'is_published')::BOOLEAN, is_published),
      pass_threshold_type = COALESCE(p_exam_data->>'pass_threshold_type', pass_threshold_type),
      pass_threshold_value = COALESCE((p_exam_data->>'pass_threshold_value')::NUMERIC, pass_threshold_value),
      has_negative_marking = COALESCE((p_exam_data->>'has_negative_marking')::BOOLEAN, has_negative_marking),
      negative_marks_value = COALESCE((p_exam_data->>'negative_marks_value')::NUMERIC, negative_marks_value),
      allowed_attempts = COALESCE((p_exam_data->>'allowed_attempts')::INTEGER, allowed_attempts),
      allow_type = COALESCE(p_exam_data->>'allow_type', allow_type),
      allow_instant_result = COALESCE((p_exam_data->>'allow_instant_result')::BOOLEAN, allow_instant_result),
      result_scheduled_at = (p_exam_data->>'result_scheduled_at')::TIMESTAMPTZ,
      has_publishable_changes = TRUE, -- Any save counts as a change
      updated_at = NOW()
    WHERE id = v_final_exam_id AND organization_id = p_org_id;
  END IF;

  -- 3. Sync Groups (Access Control)
  IF p_batches_upsert IS NOT NULL AND array_length(p_batches_upsert, 1) > 0 THEN
    DELETE FROM public.exam_batch_mapper WHERE exam_id = v_final_exam_id;

    INSERT INTO public.exam_batch_mapper (p_org_id, exam_id, group_id)
    SELECT p_org_id, v_final_exam_id, gid FROM unnest(p_batches_upsert) AS gid;
  END IF;

  -- 4. Delete Segments & Questions
  IF array_length(p_segments_delete, 1) > 0 THEN
    DELETE FROM public.exam_segments WHERE id = ANY(p_segments_delete) AND exam_id = v_final_exam_id;
  END IF;

  IF array_length(p_questions_delete, 1) > 0 THEN
    DELETE FROM public.questions WHERE id = ANY(p_questions_delete) AND exam_id = v_final_exam_id;
  END IF;

  -- 5. Batch Upsert Segments
  IF p_segments_upsert IS NOT NULL AND jsonb_array_length(p_segments_upsert) > 0 THEN
    INSERT INTO public.exam_segments (
        id, exam_id, name, order_index, requires_individual_pass, 
        pass_threshold_type, pass_threshold_value
    )
    SELECT 
        (val->>'id')::UUID, v_final_exam_id, val->>'name', val->>'order_index',
        COALESCE((val->>'requires_individual_pass')::BOOLEAN, FALSE),
        val->>'pass_threshold_type', COALESCE((val->>'pass_threshold_value')::NUMERIC, 0)
    FROM jsonb_array_elements(p_segments_upsert) AS val
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        order_index = EXCLUDED.order_index,
        requires_individual_pass = EXCLUDED.requires_individual_pass,
        pass_threshold_type = EXCLUDED.pass_threshold_type,
        pass_threshold_value = EXCLUDED.pass_threshold_value;
  END IF;

  -- 6. Batch Upsert Questions
  IF p_questions_upsert IS NOT NULL AND jsonb_array_length(p_questions_upsert) > 0 THEN
    INSERT INTO public.questions (
        id, organization_id, exam_id, segment_id, subject_id, 
        question_text, question_type, options, correct_answer, 
        marks, negative_marks, correct_feedback, incorrect_feedback, 
        order_index, is_exam_question
    )
    SELECT 
        (val->>'id')::UUID, p_org_id, v_final_exam_id, (val->>'segment_id')::UUID, (val->>'subject_id')::UUID,
        val->>'question_text', COALESCE(val->>'question_type', 'mcq'), val->'options', val->>'correct_answer',
        (val->>'marks')::NUMERIC, COALESCE((val->>'negative_marks')::NUMERIC, 0),
        val->>'correct_feedback', val->>'incorrect_feedback',
        COALESCE(val->>'order_index', 'a0'), TRUE
    FROM jsonb_array_elements(p_questions_upsert) AS val
    ON CONFLICT (id) DO UPDATE SET
        segment_id = EXCLUDED.segment_id,
        subject_id = EXCLUDED.subject_id,
        question_text = EXCLUDED.question_text,
        question_type = EXCLUDED.question_type,
        options = EXCLUDED.options,
        correct_answer = EXCLUDED.correct_answer,
        marks = EXCLUDED.marks,
        negative_marks = EXCLUDED.negative_marks,
        order_index = EXCLUDED.order_index,
        updated_at = NOW();
  END IF;

  RETURN jsonb_build_object('success', true, 'exam_id', v_final_exam_id);
END;
$$;