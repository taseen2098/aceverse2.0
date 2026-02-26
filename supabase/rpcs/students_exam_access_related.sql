-- ================= RPCs =================

CREATE OR REPLACE FUNCTION check_exam_batch_access(exam_uuid UUID, student_member_uuid UUID, organization_id UUID, allow_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE 
    v_is_org_active BOOLEAN;
BEGIN

    -- 1. Public Check
    IF allow_type = 'public' THEN 
        RETURN TRUE;
    END IF;

    -- 2. Policy: All in Organization
    IF allow_type = 'all_in_organization' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.memberships
            WHERE user_id = student_member_uuid
              AND organization_id = organization_id
        );
    END IF;

    -- 3. Policy: Group-based
    IF allow_type = 'group_based' THEN
        IF EXISTS (
            SELECT 1 FROM public.batches b
            JOIN public.group_members gm ON b.group_id = gm.group_id
            WHERE b.exam_id = exam_uuid
              AND gm.user_id = student_member_uuid
        ) THEN 
            RETURN TRUE; 
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION start_or_resume_logic_only(p_exam_id UUID, p_student_member_id UUID)
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

    -- 1. Identity/Active status Check
    IF v_student_id IS NULL THEN 
        RAISE EXCEPTION 'Unauthorized: Login required'; 
    END IF;

    if is_org_active(organization_id) = FALSE THEN
        RETURN FALSE;
    END IF;

    SELECT id, is_published, allow_type, organization_id, start_time, end_time, allowed_attempts, duration
    INTO v_exam FROM public.exams WHERE id = p_exam_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Exam not found'; END IF;
    IF NOT v_exam.is_published THEN RAISE EXCEPTION 'Exam is not published'; END IF;

    -- 1. Timing
    IF v_exam.start_time IS NOT NULL AND now() < v_exam.start_time THEN 
        RAISE EXCEPTION 'Exam hasn''t started yet'; 
    END IF;
    IF v_exam.end_time IS NOT NULL AND now() > v_exam.end_time THEN 
        RAISE EXCEPTION 'Exam has already ended'; 
    END IF;

    -- 2. Internal Call to your existing access function
    IF NOT (SELECT check_exam_batch_access(p_exam_id, v_student_id, v_exam.organization_id, v_exam.allow_type)) THEN 
        RAISE EXCEPTION 'Access Denied'; 
    END IF;

    
    -- 3. Resume or Create Logic
    SELECT id, started_at INTO v_active_sub 
    FROM public.submissions 
    WHERE exam_id = p_exam_id AND student_member_id = p_student_member_id 
      AND (started_at + (v_exam.duration * interval '1 minute') + v_grace_period) > now()
    ORDER BY started_at DESC LIMIT 1;

    IF v_active_sub.id IS NULL THEN
        SELECT count(*)::int INTO v_submitted_count FROM public.submissions 
        WHERE exam_id = p_exam_id AND student_member_id = p_student_member_id;

        IF v_submitted_count >= COALESCE(v_exam.allowed_attempts, 1) THEN
            RAISE EXCEPTION 'Max attempts reached';
        END IF;

        INSERT INTO public.submissions (exam_id, student_member_id, started_at)
        VALUES (p_exam_id, p_student_member_id, now())
        RETURNING id, started_at INTO v_active_sub;
    END IF;

    -- 4. Fetch Previous Answers (Small JSON)
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

-- 2. Revoke all default permissions (Public/Authenticated)
REVOKE EXECUTE ON FUNCTION start_or_resume_logic_only(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION start_or_resume_logic_only(jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION start_or_resume_logic_only(jsonb) FROM anon;

-- 3. Grant access ONLY to the service_role
GRANT EXECUTE ON FUNCTION start_or_resume_logic_only(jsonb) TO service_role;


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

-- Revoke all default permissions (Public/Authenticated)
REVOKE EXECUTE ON FUNCTION get_exam_content_bundle(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_exam_content_bundle(jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_exam_content_bundle(jsonb) FROM anon;

-- Grant access ONLY to the service_role
GRANT EXECUTE ON FUNCTION get_exam_content_bundle(jsonb) TO service_role;