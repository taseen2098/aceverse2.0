-- ================= RLS POLICIES =================

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_batch_mapper ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_batch_mapper ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_member_mapper ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 1. Organizations (Fixed)
CREATE POLICY "Owners have full control" ON public.organizations
FOR ALL USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "Staff can view their org" ON public.organizations
FOR SELECT USING (public.is_org_staff(id));

-- 2. Profiles
create policy "Public profiles are viewable by everyone" 
on public.profiles for select using (true);

create policy "Users can update own profile" 
on public.profiles for update using (auth.uid() = id);

-- 2. Memberships
CREATE POLICY "Org members can view memberships" ON public.memberships
FOR SELECT USING (public.is_org_member(organization_id));

-- 3. Subjects (@orgcontentpolicy)
CREATE POLICY "Staff manage subjects" ON public.subjects
FOR ALL USING (public.is_org_staff(organization_id)) WITH CHECK (public.is_org_staff(organization_id));

CREATE POLICY "Students view subjects" ON public.subjects
FOR SELECT USING (public.is_org_member(organization_id));

-- 4. Exams (@staffonlypolicy)
CREATE POLICY "Staff manage exams" ON public.exams
FOR ALL USING (public.is_org_staff(organization_id)) WITH CHECK (public.is_org_staff(organization_id));

-- 5. Exam Segments (@orgcontentpolicy)
CREATE POLICY "Staff manage segments" ON public.exam_segments
FOR ALL USING (public.is_org_staff(organization_id)) WITH CHECK (public.is_org_staff(organization_id));

CREATE POLICY "Students view segments" ON public.exam_segments
FOR SELECT USING (public.is_org_member(organization_id));

-- 6. Questions (@staffonlypolicy)
CREATE POLICY "Staff manage questions" ON public.questions
FOR ALL USING (public.is_org_staff(organization_id)) WITH CHECK (public.is_org_staff(organization_id));

-- 7. Batches (@staffonlypolicy)
CREATE POLICY "Staff manage batches" ON public.batches
FOR ALL USING (public.is_org_staff(organization_id)) WITH CHECK (public.is_org_staff(organization_id));

-- 8. Exam Batch Mapper (@staffonlypolicy)
CREATE POLICY "Staff manage exam batches" ON public.exam_batch_mapper
FOR ALL USING (public.is_org_staff(organization_id)) WITH CHECK (public.is_org_staff(organization_id));

-- 9. Question Batch Mapper (@staffonlypolicy)
CREATE POLICY "Staff manage question batches" ON public.question_batch_mapper
FOR ALL USING (public.is_org_staff(organization_id)) WITH CHECK (public.is_org_staff(organization_id));

-- 10. Batch Member Mapper (@staffonlypolicy)
CREATE POLICY "Staff manage batch members" ON public.batch_member_mapper
FOR ALL USING (public.is_org_staff(organization_id)) WITH CHECK (public.is_org_staff(organization_id));

-- 11. Submissions (@staffonlyreadpolicy)
CREATE POLICY "Staff view submissions" ON public.submissions
FOR SELECT USING (public.is_org_staff(organization_id));

-- 12. Submission Exam Segment (@staffonlyreadpolicy)
CREATE POLICY "Staff view submission segments" ON public.segment_scores
FOR SELECT USING (public.is_org_staff(organization_id));

-- 13. Answers (@staffonlyreadpolicy)
CREATE POLICY "Staff view answers" ON public.answers
FOR SELECT USING (public.is_org_staff(organization_id));

-- 14. Org Join Requests
CREATE POLICY "Users manage own requests" ON public.org_join_requests
FOR ALL USING (requester_id = (SELECT auth.uid())) 
WITH CHECK (requester_id = (SELECT auth.uid()) AND status = 'pending');

CREATE POLICY "Staff manage join requests" ON public.org_join_requests
FOR ALL USING (public.is_org_staff(org_id));

-- 15. Announcements
CREATE POLICY "Staff manage announcements" ON public.announcements
FOR ALL USING (public.is_org_staff(org_id)) WITH CHECK (public.is_org_staff(organization_id));

CREATE POLICY "Members view announcements" ON public.announcements
FOR SELECT USING (public.is_org_member(org_id));

-- 16. Payments
-- Policy: Only the member who made the payment or Org Staff can view it
CREATE POLICY "Users view own payments" ON public.payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.id = membership_id AND m.user_id = (SELECT auth.uid())
  )
);

-----------------

-- 17. Realtime (Retained as per instructions)
CREATE POLICY "Hub Realtime Access" ON realtime.messages FOR ALL USING (
  (topic ~ '^private:org:[0-9a-fA-F-]{36}$') AND (
    -- 1. Fast path: Check if they are a Global Admin
    (auth.jwt() -> 'app_metadata' ->> 'global_role') = 'admin'
    OR 
    -- 2. Truth path: Check the actual DB for an ACTIVE membership
    EXISTS (
      SELECT 1 FROM public.memberships m 
      WHERE m.user_id = (SELECT auth.uid()) 
      AND m.organization_id = (split_part(topic, ':', 3))::uuid 
      AND m.status = 'active' -- This is the "Kill Switch"
      AND m.member_role IN ('owner', 'manager', 'teacher', 'student')
    )
  )
);
