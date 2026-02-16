-- ================= TRIGGERS =================



-- 1. Handle Updated At
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER AS $$ 
BEGIN 
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_exams BEFORE UPDATE ON public.exams;
CREATE TRIGGER set_updated_at_exams 
BEFORE UPDATE ON public.exams 
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Sync User Roles to Metadata (Realtime Optimization)
CREATE OR REPLACE FUNCTION public.sync_user_roles_to_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_org_roles JSONB;
  v_global_role TEXT;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Prevent errors if user_id is null (edge cases)
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  SELECT jsonb_object_agg(organization_id, member_role)
  INTO v_org_roles
  FROM public.memberships
  WHERE user_id = v_user_id;

  SELECT role INTO v_global_role
  FROM public.profiles
  WHERE id = v_user_id;

  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'org_roles', COALESCE(v_org_roles, '{}'::jsonb),
      'global_role', v_global_role
    )
  WHERE id = v_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_membership_change_sync ON public.memberships;
CREATE TRIGGER on_membership_change_sync
AFTER INSERT OR UPDATE OR DELETE ON public.memberships
FOR EACH ROW EXECUTE FUNCTION public.sync_user_roles_to_metadata();

DROP TRIGGER IF EXISTS on_profile_role_change_sync ON public.profiles;
CREATE TRIGGER on_profile_role_change_sync
AFTER UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_user_roles_to_metadata();
