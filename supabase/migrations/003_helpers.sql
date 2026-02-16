-- ================= HELPER FUNCTIONS =================


-- 1. Is Org Member Above Student (Staff Check)
CREATE OR REPLACE FUNCTION public.is_org_member_above_student(org_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND member_role IN ('primary_owner', 'manager', 'teacher')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Is Admin (Global)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Get Submission Count (For Limits)
CREATE OR REPLACE FUNCTION public.get_submission_count(p_exam_id UUID, p_student_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT count(*)::INTEGER
    FROM public.submissions
    WHERE exam_id = p_exam_id AND student_id = p_student_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Is Group Member (Recursion Breaker)
CREATE OR REPLACE FUNCTION public.is_batch_member(p_batch_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.batch_member_mapper
    WHERE batch_id = p_batch_id
    AND user_id = auth.uid()
  );
END;
$$;


