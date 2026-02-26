-- ================= HELPER FUNCTIONS (OPTIMIZED) =================


-- 4. Is Org Active (Fixed the Identity Crisis)
CREATE OR REPLACE FUNCTION public.is_org_active(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = org_id AND status = 'active'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- 1. Get Org Role
-- Assuming a user has one role per org. If they have multiple, the ORDER BY handles priority.
CREATE OR REPLACE FUNCTION public.get_org_role(org_id UUID)
RETURNS TEXT AS $$
  SELECT member_role 
  FROM public.memberships
  WHERE organization_id = org_id AND user_id = (select auth.uid())
  ORDER BY CASE member_role
    WHEN 'student' THEN 5  -- Most frequent, evaluate first
    WHEN 'teacher' THEN 4  -- Second most frequent
    WHEN 'manager' THEN 3
    WHEN 'owner' THEN 2
    WHEN 'admin' THEN 1    -- Rarest, evaluate last
    ELSE 6 END
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Is Org Member (Checks if org is active and user is linked)
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.memberships m
    JOIN public.organizations o ON m.organization_id = o.id
    WHERE m.organization_id = org_id 
    AND m.user_id = (select auth.uid())
    AND o.status = 'active'
    AND m.status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 3. Is Org Staff (One clean, lightning-fast join)
CREATE OR REPLACE FUNCTION public.is_org_staff(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.memberships m
    JOIN public.organizations o ON m.organization_id = o.id
    WHERE m.organization_id = org_id 
    AND m.user_id = (select auth.uid())
    AND o.status = 'active'
    AND m.member_role IN ('owner', 'admin', 'manager', 'teacher')
    AND m.status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 4. Get Submission Count (Stripped the PL/pgSQL overhead)
CREATE OR REPLACE FUNCTION public.get_submission_count(p_exam_id UUID, p_student_member_id UUID)
RETURNS INTEGER AS $$
  SELECT count(*)::INTEGER
  FROM public.submissions
  WHERE exam_id = p_exam_id AND student_member_id = p_student_member_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 5. Is Batch Member (Fixed the Identity Crisis)
-- Correctly bridges (select auth.uid()) -> memberships table -> batch_member_mapper
CREATE OR REPLACE FUNCTION public.is_batch_member(p_batch_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.batch_member_mapper bmm
    JOIN public.memberships m ON bmm.student_member_id = m.id
    WHERE bmm.batch_id = p_batch_id
    AND m.user_id = (select auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;