
CREATE OR REPLACE FUNCTION get_public_exam_meta(p_exam_id UUID)
RETURNS JSONB 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_result JSONB;
BEGIN

    IF public.is_org_active(p_exam_id) =  THEN
        RAISE EXCEPTION 'The organization is not currently maintained by user';
    END IF;
    
    SELECT jsonb_build_object(
        'id', id,
        'title', title,
        'description', description,
        'duration', duration,
        'questionCount', (SELECT COUNT(*) FROM questions WHERE exam_id = p_exam_id),
        'is_published', is_published,
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
    IF (v_result->>'is_published')::BOOLEAN = FALSE THEN
        RAISE EXCEPTION 'Exam is not yet published';
    END IF;

    IF v_result->>'end_time' IS NOT NULL AND NOW() > (v_result->>'end_time')::TIMESTAMPTZ THEN
        RAISE EXCEPTION 'This exam has already ended';
    END IF;

    RETURN v_result;
END;
$$;
