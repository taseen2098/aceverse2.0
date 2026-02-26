-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================= TABLES =================

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT CHECK (status IN ('active', 'suspended')) NOT NULL,
  logo_url TEXT,
  banner_url TEXT,
  theme_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  join_system TEXT CHECK (join_system IN ('public', 'request', 'paid')) NOT NULL
);

-- 2. Create the profile table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- 2. Memberships
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  member_role TEXT CHECK (member_role IN ('admin', 'owner', 'manager', 'teacher', 'student')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  status TEXT CHECK (status IN ('active', 'suspended', 'pending', 'cancelled')) NOT NULL,
  on_free_trial BOOLEAN DEFAULT FALSE NOT NULL,
  subscribed_upto TIMESTAMPTZ
);

-- 3. Payments
CREATE TABLE IF NOT EXISTS public.payments (
  -- Internal unique reference
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  membership_id UUID REFERENCES public.memberships(id) ON DELETE CASCADE NOT NULL,
  -- The ID you send to SSLCommerz (Your internal tracking ID)
  tran_id TEXT UNIQUE NOT NULL, 
  -- The ID SSLCommerz gives back after successful validation (Bank Ref)
  bank_tran_id TEXT UNIQUE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'BDT',
  -- Essential for 1:Many payment tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL
);

-- 5. Exams
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  questions_count INTEGER DEFAULT 0 NOT NULL,

  created_by UUID REFERENCES public.memberships(id),
  is_published BOOLEAN DEFAULT FALSE NOT NULL,
  has_publishable_changes BOOLEAN DEFAULT TRUE NOT NULL,

  duration INTEGER NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  allowed_attempts INTEGER DEFAULT 1 NOT NULL,
  allow_instant_result BOOLEAN DEFAULT FALSE NOT NULL,

  pass_threshold_type TEXT CHECK (pass_threshold_type IN ('percent', 'fixed', 'none')),
  pass_threshold_value NUMERIC,
  has_negative_marking BOOLEAN DEFAULT FALSE NOT NULL,
  negative_marks_value NUMERIC DEFAULT 0 NOT NULL,

  allow_type TEXT CHECK (allow_type IN ('public', 'group_based', 'everyone_in_org')) NOT NULL,

  result_scheduled_at TIMESTAMPTZ,
  results_published BOOLEAN DEFAULT FALSE NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. Exam Segments
CREATE TABLE IF NOT EXISTS public.exam_segments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  order_index TEXT NOT NULL,
  requires_individual_pass BOOLEAN DEFAULT FALSE NOT NULL,
  pass_threshold_type TEXT CHECK (pass_threshold_type IN ('percent', 'fixed', 'none')),
  pass_threshold_value NUMERIC
);

-- 7. Questions
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id),
  exam_id UUID REFERENCES public.exams(id),
  segment_id UUID REFERENCES public.exam_segments(id),
  question_text TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('mcq', 'short_answer')) NOT NULL,
  options JSONB,
  correct_answer TEXT,
  marks NUMERIC DEFAULT 0 NOT NULL,
  negative_marks NUMERIC,
  correct_feedback TEXT,
  incorrect_feedback TEXT,
  order_index TEXT
);

-- 8. Batches
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL
);

-- 9. Exam Batch Mapper
CREATE TABLE IF NOT EXISTS public.exam_batch_mapper (
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (exam_id, batch_id)
);

-- 10. Question Batch Mapper
CREATE TABLE IF NOT EXISTS public.question_batch_mapper (
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (question_id, batch_id)
);

-- 11. Batch Member Mapper
CREATE TABLE IF NOT EXISTS public.batch_member_mapper (
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  student_member_id UUID REFERENCES public.memberships(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (batch_id, student_member_id)
);

-- 12. Submissions
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  student_member_id UUID REFERENCES public.memberships(id) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  submitted_at TIMESTAMPTZ,
  -- Result Data
  total_score NUMERIC DEFAULT 0,
  max_score NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  passed BOOLEAN DEFAULT FALSE,
  is_graded BOOLEAN DEFAULT FALSE,
  graded_at TIMESTAMPTZ
);

-- 13. Submission Segment Scores
CREATE TABLE public.segment_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
  segment_id UUID REFERENCES public.exam_segments(id) ON DELETE CASCADE NOT NULL,
  score NUMERIC DEFAULT 0,
  max_score NUMERIC DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  passed BOOLEAN DEFAULT FALSE,
  total_questions INTEGER DEFAULT 0,
  answered INTEGER DEFAULT 0,
  correct INTEGER DEFAULT 0,
  incorrect INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0
);

-- 14. Answers
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT,
  -- Grading columns
  is_correct BOOLEAN DEFAULT FALSE,
  marks_awarded NUMERIC DEFAULT 0,
  is_marked BOOLEAN DEFAULT FALSE
);

-- 15. Org Join Requests
CREATE TABLE IF NOT EXISTS public.org_join_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  requester_id UUID REFERENCES auth.users(id) NOT NULL,
  for_role TEXT CHECK (for_role IN ('manager', 'teacher', 'student')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'rejected')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(requester_id, org_id)
);

-- 16. Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL, 
  created_by UUID REFERENCES public.memberships(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);


-- ================= CORE SYSTEM INDEXES =================

-- 1. Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);

-- 2. Memberships (CRITICAL for RLS and Auth lookups)
-- Composite index because we almost always query both to check if a user is in an org
CREATE INDEX IF NOT EXISTS idx_memberships_org_user ON public.memberships(organization_id, user_id, status);
-- Standalone index for looking up all memberships for a specific user
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);

-- 3. Payments
CREATE INDEX IF NOT EXISTS idx_payments_membership_id ON public.payments(membership_id);

-- ================= CONTENT & EXAM INDEXES =================

-- 4. Subjects
CREATE INDEX IF NOT EXISTS idx_subjects_org_id ON public.subjects(organization_id);

-- 5. Exams
CREATE INDEX IF NOT EXISTS idx_exams_org_id ON public.exams(organization_id);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON public.exams(created_by);

-- 6. Exam Segments
CREATE INDEX IF NOT EXISTS idx_segments_exam_id ON public.exam_segments(exam_id);
CREATE INDEX IF NOT EXISTS idx_segments_org_id ON public.exam_segments(organization_id);

-- 7. Questions (The heaviest table)
CREATE INDEX IF NOT EXISTS idx_questions_org_id ON public.questions(organization_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON public.questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_segment_id ON public.questions(segment_id);

-- ================= BATCH MAPPERS =================

-- Note: Primary Keys (A, B) already create an index on A. 
-- We only need to create reverse indexes on B for reverse lookups.

-- 8. Batches
CREATE INDEX IF NOT EXISTS idx_batches_org_id ON public.batches(organization_id);

-- 9. Exam Batch Mapper (Reverse lookup: Get all exams in a batch)
CREATE INDEX IF NOT EXISTS idx_exam_batch_batch_id ON public.exam_batch_mapper(batch_id);

-- 10. Question Batch Mapper (Reverse lookup: Get all questions in a batch)
CREATE INDEX IF NOT EXISTS idx_question_batch_batch_id ON public.question_batch_mapper(batch_id);

-- 11. Batch Member Mapper (Reverse lookup: Get all batches for a student)
CREATE INDEX IF NOT EXISTS idx_batch_member_student ON public.batch_member_mapper(student_member_id);

-- ================= SUBMISSIONS & GRADING =================

-- 12. Submissions (High traffic during exams)
CREATE INDEX IF NOT EXISTS idx_submissions_exam_id ON public.submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.submissions(student_member_id);
CREATE INDEX IF NOT EXISTS idx_submissions_org_id ON public.submissions(organization_id);

-- 13. Submission Segment Scores
CREATE INDEX IF NOT EXISTS idx_segment_scores_submission_id ON public.segment_scores(submission_id);

ALTER TABLE public.segment_scores
ADD CONSTRAINT unique_submission_segment
UNIQUE (submission_id, segment_id);

-- 14. Answers (Will have the most rows in the entire database)
CREATE INDEX IF NOT EXISTS idx_answers_submission_id ON public.answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON public.answers(question_id);
CREATE UNIQUE INDEX idx_answers_submission_question
ON public.answers(submission_id, question_id);

-- ================= MISC =================

-- 15. Org Join Requests
CREATE INDEX IF NOT EXISTS idx_join_requests_org_id ON public.org_join_requests(organization_id);

-- 16. Announcements
CREATE INDEX IF NOT EXISTS idx_announcements_org_id ON public.announcements(organization_id);