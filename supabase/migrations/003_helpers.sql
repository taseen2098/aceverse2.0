-- ================= HELPER FUNCTIONS =================

-- 1. Get Org Role
CREATE OR REPLACE FUNCTION public.get_org_role(org_id UUID)
RETURNS TEXT AS $$
  SELECT member_role 
  FROM public.memberships
  WHERE organization_id = org_id AND user_id = auth.uid()
  ORDER BY CASE member_role
    WHEN 'owner' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'manager' THEN 3
    WHEN 'teacher' THEN 4
    ELSE 5 END
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Is Org Member (Checks if org is active)
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.organizations o ON m.organization_id = o.id
    WHERE m.organization_id = org_id 
    AND m.user_id = auth.uid()
    AND o.status = 'active'
  );
END;
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Is Org Staff (Checks if org is active and role is staff)
CREATE OR REPLACE FUNCTION public.is_org_staff(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  role TEXT;
  is_active BOOLEAN;
BEGIN
  -- Check if org is active
  SELECT (status = 'active') INTO is_active
  FROM public.organizations
  WHERE id = org_id;

  IF is_active IS NOT TRUE THEN
    RETURN FALSE;
  END IF;
  
  role := public.get_org_role(org_id);
  -- Roles from objects.ts StaffRoles: ["owner", "manager", "teacher", "admin"]
  RETURN role IN ('owner', 'manager', 'teacher', 'admin');
END;
$$ LANGUAGE sql SECURITY DEFINER;

-- 4. Get Submission Count
CREATE OR REPLACE FUNCTION public.get_submission_count(p_exam_id UUID, p_student_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT count(*)::INTEGER
    FROM public.submissions
    WHERE exam_id = p_exam_id AND student_id = p_student_id
  );
END;
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. Is Batch Member
CREATE OR REPLACE FUNCTION public.is_batch_member(p_batch_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.batch_member_mapper
    WHERE batch_id = p_batch_id
    AND student_id = auth.uid()
  );
END;
$$ LANGUAGE sql SECURITY DEFINER;
