-- ================= RLS POLICIES =================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- --- PROFILES ---
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Staff can view profiles of org members" ON public.profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.memberships m1
    JOIN public.memberships m2 ON m1.organization_id = m2.organization_id
    WHERE m1.user_id = auth.uid()
    AND m1.member_role IN ('primary_owner', 'manager', 'teacher')
    AND m2.user_id = public.profiles.id
  )
);

-- --- ORGANIZATIONS ---
CREATE POLICY "Members can view their own organizations" ON public.organizations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = organizations.id AND user_id = auth.uid())
);

-- --- MEMBERSHIPS ---
CREATE POLICY "Users can view own memberships" ON public.memberships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Org staff can view memberships of their org" ON public.memberships FOR SELECT USING (
  public.is_org_member_above_student(organization_id) OR public.is_admin()
);

-- --- SUBJECTS ---
CREATE POLICY "Members can view org subjects" ON public.subjects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.memberships WHERE organization_id = subjects.organization_id AND user_id = auth.uid()) OR public.is_admin()
);
CREATE POLICY "Staff can manage subjects" ON public.subjects FOR ALL USING (
  public.is_org_member_above_student(organization_id) OR public.is_admin()
) WITH CHECK (
  public.is_org_member_above_student(organization_id) OR public.is_admin()
);

-- --- EXAMS ---
CREATE POLICY "Org Staff can view all exams in their org" ON public.exams FOR SELECT USING (
  public.is_org_member_above_student(organization_id) OR public.is_admin()
);
CREATE POLICY "Org Staff can create exams" ON public.exams FOR INSERT WITH CHECK (
  public.is_org_member_above_student(organization_id) OR public.is_admin()
);
CREATE POLICY "Org Staff can update exams" ON public.exams FOR UPDATE USING (
  public.is_org_member_above_student(organization_id) OR public.is_admin()
);
CREATE POLICY "Org Staff can delete exams" ON public.exams FOR DELETE USING (
  public.is_org_member_above_student(organization_id) OR public.is_admin()
);
CREATE POLICY "Students can view active accessible exams" ON public.exams FOR SELECT USING (
  is_active = true AND public.check_exam_access(id, auth.uid())
);

-- --- EXAM SEGMENTS ---
CREATE POLICY "Org Staff can manage exam segments" ON public.exam_segments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_segments.exam_id AND (public.is_org_member_above_student(e.organization_id) OR public.is_admin()))
);
CREATE POLICY "Students can view exam segments" ON public.exam_segments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_segments.exam_id AND e.is_active = true AND public.check_exam_access(e.id, auth.uid()))
);

-- --- QUESTIONS ---
-- Note: Students view questions ONLY via the secure_questions VIEW.
CREATE POLICY "Staff manage questions" ON public.questions FOR ALL USING (
  public.is_org_member_above_student(organization_id)
) WITH CHECK (
  public.is_org_member_above_student(organization_id)
);

-- --- SUBMISSIONS ---
CREATE POLICY "Students can view own submissions" ON public.submissions FOR SELECT USING (
  student_id = auth.uid() AND (
    (submitted_at IS NULL AND EXISTS (SELECT 1 FROM public.exams e WHERE e.id = submissions.exam_id AND (e.end_time IS NULL OR e.end_time + INTERVAL '2 minutes' > NOW())))
    OR
    (submitted_at IS NOT NULL AND EXISTS (SELECT 1 FROM public.exams e WHERE e.id = submissions.exam_id AND e.results_published = true))
  )
);
CREATE POLICY "Students can create submissions" ON public.submissions FOR INSERT WITH CHECK (
  student_id = auth.uid()
  AND public.check_exam_access(exam_id, auth.uid())
  AND (public.get_submission_count(exam_id, auth.uid()) < (SELECT allowed_attempts FROM public.exams WHERE id = exam_id))
  AND EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND is_active = true AND (start_time IS NULL OR start_time <= NOW()) AND (end_time IS NULL OR end_time + INTERVAL '2 minutes' > NOW()))
);
CREATE POLICY "Students can update own submissions" ON public.submissions FOR UPDATE USING (
  student_id = auth.uid() AND submitted_at IS NULL AND EXISTS (
    SELECT 1 FROM public.exams e WHERE e.id = submissions.exam_id AND (e.end_time IS NULL OR e.end_time + INTERVAL '2 minutes' > NOW())
    AND (submissions.started_at + (e.duration * INTERVAL '1 minute') + INTERVAL '2 minutes' > NOW())
  )
);
CREATE POLICY "Staff can view submissions" ON public.submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.exams e WHERE e.id = submissions.exam_id AND public.is_org_member_above_student(e.organization_id))
);

-- --- ANSWERS ---
CREATE POLICY "Students manage answers during exam" ON public.answers FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.submissions s JOIN public.exams e ON s.exam_id = e.id
    WHERE s.id = answers.submission_id AND s.student_id = auth.uid() AND s.submitted_at IS NULL
    AND public.check_exam_access(s.exam_id, auth.uid())
    AND (e.end_time IS NULL OR e.end_time + INTERVAL '2 minutes' > NOW())
    AND (s.started_at + (e.duration * INTERVAL '1 minute') + INTERVAL '2 minutes' > NOW())
  )
);
CREATE POLICY "Staff view answers" ON public.answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.submissions s JOIN public.exams e ON s.exam_id = e.id WHERE s.id = answers.submission_id AND public.is_org_member_above_student(e.organization_id))
);

-- --- STUDENT GROUPS ---
CREATE POLICY "Staff manage student_groups" ON public.student_groups FOR ALL USING (
  public.is_org_member_above_student(organization_id) OR public.is_admin()
);
CREATE POLICY "Students view assigned groups" ON public.student_groups FOR SELECT USING (public.is_group_member(id));

-- --- GROUP MEMBERS ---
CREATE POLICY "Staff manage group_members" ON public.group_members FOR ALL USING (
  public.is_group_staff_or_admin(group_id)
) WITH CHECK (
  public.is_group_staff_or_admin(group_id)
);
CREATE POLICY "Users view own memberships" ON public.group_members FOR SELECT USING (user_id = auth.uid());

-- --- EXAM GROUPS ---
CREATE POLICY "Staff manage exam_groups" ON public.exam_groups FOR ALL USING (
  public.can_manage_exam_groups(exam_id)
) WITH CHECK (
  public.can_manage_exam_groups(exam_id)
);
CREATE POLICY "Students view assigned exam_groups" ON public.exam_groups FOR SELECT USING (public.is_group_member(group_id));

-- --- JOIN REQUESTS ---
CREATE POLICY "Students can view own join_requests" ON public.join_requests FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can create join_requests" ON public.join_requests FOR INSERT WITH CHECK (
  student_id = auth.uid() AND EXISTS (SELECT 1 FROM public.exams e WHERE e.id = join_requests.exam_id AND e.is_active = true)
);
CREATE POLICY "Staff can manage join_requests" ON public.join_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.exams e WHERE e.id = join_requests.exam_id AND (public.is_org_member_above_student(e.organization_id) OR public.is_admin()))
);

-- --- REALTIME ---
CREATE POLICY "Hub Realtime Access" ON realtime.messages FOR ALL USING (
  (topic ~ '^private:org:[0-9a-fA-F-]{36}$') AND (
    (auth.jwt() -> 'app_metadata' ->> 'global_role') = 'admin'
    OR (auth.jwt() -> 'app_metadata' -> 'org_roles' ->> (split_part(topic, ':', 3))) IN ('primary_owner', 'manager', 'teacher')
    OR EXISTS (SELECT 1 FROM public.memberships m WHERE m.user_id = auth.uid() AND m.organization_id = (split_part(topic, ':', 3))::uuid AND m.member_role IN ('primary_owner', 'manager', 'teacher'))
  )
);
