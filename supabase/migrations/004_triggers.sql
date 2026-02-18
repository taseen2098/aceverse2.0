-- ================= TRIGGERS =================

-- 1. Handle Updated At
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$ 
BEGIN 
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_exams ON public.exams;
CREATE TRIGGER set_updated_at_exams 
BEFORE UPDATE ON public.exams 
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Calculate Instant Score
CREATE OR REPLACE FUNCTION public.calculate_instant_score()
RETURNS TRIGGER AS $$
DECLARE
  v_allow_instant BOOLEAN;
BEGIN
  -- Check if exam allows instant result
  SELECT allow_instant_result INTO v_allow_instant
  FROM public.exams
  WHERE id = NEW.exam_id;

  IF v_allow_instant AND NEW.submitted_at IS NOT NULL THEN
     -- Scoring logic would go here (joining answers and questions)
     INSERT INTO public.submission_secret_data (submission_id, exam_id, is_graded, total_score)
     VALUES (NEW.id, NEW.exam_id, TRUE, 0)
     ON CONFLICT (submission_id) DO UPDATE
     SET is_graded = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_submission_complete ON public.submissions;
CREATE TRIGGER on_submission_complete
AFTER UPDATE OF submitted_at ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION public.calculate_instant_score();

-- 3. Sync User Roles to Metadata (Realtime Optimization)
CREATE OR REPLACE FUNCTION public.sync_user_roles_to_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_org_roles JSONB;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT jsonb_object_agg(organization_id, member_role)
  INTO v_org_roles
  FROM public.memberships
  WHERE user_id = v_user_id;

  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('org_roles', COALESCE(v_org_roles, '{}'::jsonb))
  WHERE id = v_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_membership_change_sync ON public.memberships;
CREATE TRIGGER on_membership_change_sync
AFTER INSERT OR UPDATE OR DELETE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.sync_user_roles_to_metadata();
