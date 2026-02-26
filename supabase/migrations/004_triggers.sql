-- ================= TRIGGERS =================
-- ==========================================================
-- ACEVERSE V7.0: THE TRUE OWNERSHIP TRANSFER
-- ==========================================================


create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


  
-- 2. Create the function
CREATE OR REPLACE FUNCTION update_question_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.exams SET questions_count = questions_count + 1 WHERE id = NEW.exam_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.exams SET questions_count = questions_count - 1 WHERE id = OLD.exam_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Set the trigger
CREATE TRIGGER tr_update_question_count
AFTER INSERT OR DELETE ON public.questions
FOR EACH ROW EXECUTE FUNCTION update_question_count();


CREATE OR REPLACE FUNCTION public.transfer_org_ownership()
RETURNS TRIGGER AS $$
DECLARE
  v_old_trial_status BOOLEAN;
BEGIN
  -- Only trigger if the owner is actually changing
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    
    -- 1. Grab the old owner's trial status (so the org doesn't suddenly lose/gain billing state)
    SELECT on_free_trial INTO v_old_trial_status
    FROM public.memberships
    WHERE organization_id = NEW.id AND user_id = OLD.owner_id;

    -- 2. Demote the old owner to 'teacher'
    -- We don't delete them, otherwise exams they created (foreign keys) might break or orphan.
    UPDATE public.memberships 
    SET member_role = 'teacher' 
    WHERE organization_id = NEW.id AND user_id = OLD.owner_id;

    -- 3. Promote or Insert the new owner
    -- If they are already a student/teacher in this org, make them the owner.
    -- If they aren't in the org at all, insert a brand new membership.
    INSERT INTO public.memberships (
        id, 
        user_id, 
        organization_id, 
        member_role, 
        status, 
        on_free_trial
    )
    VALUES (
        gen_random_uuid()::text, -- Generating a safe semantic-ish ID
        NEW.owner_id,
        NEW.id,
        'owner',
        'active',
        COALESCE(v_old_trial_status, false)
    )
    ON CONFLICT (user_id, organization_id) DO UPDATE
    SET 
        member_role = 'owner',
        status = 'active';

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Nuke the old useless trigger
DROP TRIGGER IF EXISTS enforce_owner_membership_trigger ON public.organizations;

-- Attach the smart trigger
CREATE TRIGGER on_org_owner_transfer
BEFORE UPDATE OF owner_id ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.transfer_org_ownership();

-- 1. Handle Updated At
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$ 
BEGIN 
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS set_updated_at_exams ON public.exams;
CREATE TRIGGER set_updated_at_exams 
BEFORE UPDATE ON public.exams 
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================================
-- ACEVERSE SCORING ENGINE V2.0
-- Handles: Negative Marking, Segment-level passing, and Pass/Fail logic
-- ==========================================================
-- ==========================================================
-- ACEVERSE SCORING ENGINE V3.0 (PERCENTAGE GRADING)
-- ==========================================================
CREATE OR REPLACE FUNCTION public.calculate_instant_score()
RETURNS TRIGGER AS $$
DECLARE
  v_pass_threshold_type TEXT;
  v_pass_threshold_value NUMERIC;
  v_has_neg_marking BOOLEAN;
  v_global_neg_val NUMERIC;
  v_allow_instant_result BOOLEAN; -- FIXED: Added missing declaration
  v_total_score NUMERIC := 0;
  v_max_total_score NUMERIC := 0;
  v_overall_passed BOOLEAN := TRUE; 
BEGIN
  -- 1. Exit early if this isn't a submission event (Save resources)
  -- Logic: Must be an UPDATE, and submitted_at must be transitioning from NULL to a value.
  IF TG_OP = 'INSERT' OR OLD.submitted_at IS NOT NULL OR NEW.submitted_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- 2. Get Exam Config
  SELECT pass_threshold_type, pass_threshold_value, has_negative_marking, negative_marks_value, allow_instant_result
  INTO v_pass_threshold_type, v_pass_threshold_value, v_has_neg_marking, v_global_neg_val, v_allow_instant_result
  FROM public.exams
  WHERE id = NEW.exam_id;

  -- 3. Soft Exit if instant results are disabled for this exam
  IF v_allow_instant_result = FALSE THEN
    RETURN NEW;
  END IF;

  -- 4. Calculate Max Possible Score
  SELECT COALESCE(SUM(marks), 0)
  INTO v_max_total_score
  FROM public.questions
  WHERE exam_id = NEW.exam_id;

  -- 5. Grade Answers
  UPDATE public.answers a
  SET 
    is_correct = (a.answer_text = q.correct_answer),
    marks_awarded = CASE 
      WHEN a.answer_text = q.correct_answer THEN q.marks
      WHEN v_has_neg_marking AND a.answer_text IS NOT NULL THEN -1 * COALESCE(q.negative_marks, v_global_neg_val)
      ELSE 0 
    END
  FROM public.questions q
  WHERE a.question_id = q.id 
  AND a.submission_id = NEW.id;

  -- 6. Calculate Segment Scores
  WITH calculated_segments AS (
      SELECT 
          es.id as seg_id,
          es.requires_individual_pass,
          COALESCE(SUM(a.marks_awarded), 0) as seg_score,
          SUM(q.marks) as seg_max
      FROM public.exam_segments es
      JOIN public.questions q ON q.segment_id = es.id
      LEFT JOIN public.answers a ON a.question_id = q.id AND a.submission_id = NEW.id
      WHERE es.exam_id = NEW.exam_id
      GROUP BY es.id, es.requires_individual_pass
  )
  INSERT INTO public.segment_scores (submission_id, segment_id, score, max_score, passed)
  SELECT 
      NEW.id, 
      seg_id, 
      seg_score, 
      seg_max,
      -- FIXED: Added casting to NUMERIC to avoid integer division issues
      (seg_max > 0 AND (seg_score::NUMERIC / seg_max::NUMERIC) >= 0.4) 
  FROM calculated_segments
  ON CONFLICT (submission_id, segment_id) DO UPDATE
  SET score = EXCLUDED.score, passed = EXCLUDED.passed;

  -- 7. Total Acquired Score
  SELECT COALESCE(SUM(marks_awarded), 0)
  INTO v_total_score
  FROM public.answers
  WHERE submission_id = NEW.id;

  -- 8. Threshold Logic
  IF v_pass_threshold_type = 'fixed' THEN
      v_overall_passed := (v_total_score >= v_pass_threshold_value);
  ELSIF v_pass_threshold_type = 'percent' THEN
      IF v_max_total_score > 0 THEN
          v_overall_passed := ((v_total_score::NUMERIC / v_max_total_score::NUMERIC) * 100 >= v_pass_threshold_value);
      ELSE
          v_overall_passed := FALSE; 
      END IF;
  END IF;

  -- 9. Segment Override
  IF EXISTS (
      SELECT 1 FROM public.segment_scores ss 
      JOIN public.exam_segments es ON ss.segment_id = es.id
      WHERE ss.submission_id = NEW.id 
      AND es.requires_individual_pass = TRUE 
      AND ss.passed = FALSE
  ) THEN 
      v_overall_passed := FALSE;
  END IF;

  -- 10. Final State Commit
  NEW.total_score := v_total_score;
  NEW.passed := v_overall_passed;
  NEW.is_graded := TRUE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-attach with optimized trigger definition
DROP TRIGGER IF EXISTS instant_result_where_allowed ON public.submissions;
CREATE TRIGGER instant_result_where_allowed
BEFORE UPDATE OF submitted_at ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.calculate_instant_score();