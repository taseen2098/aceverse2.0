-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================= TABLES =================

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT CHECK (status IN ('active', 'suspended')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Memberships
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  member_role TEXT CHECK (member_role IN ('admin', 'owner', 'manager', 'teacher', 'student')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  on_free_trial BOOLEAN DEFAULT FALSE NOT NULL
);

-- 3. Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(id, organization_id)
);

-- 4. Exams
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  is_published BOOLEAN DEFAULT FALSE NOT NULL,
  has_publishable_changes BOOLEAN DEFAULT TRUE NOT NULL,
  duration INTEGER NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,


  pass_threshold_type TEXT CHECK (pass_threshold_type IN ('percentile', 'fixed', 'none')),
  pass_threshold_value NUMERIC,
  has_negative_marking BOOLEAN DEFAULT FALSE NOT NULL,
  negative_marks_value NUMERIC DEFAULT 0 NOT NULL,
  allowed_attempts INTEGER DEFAULT 1 NOT NULL,
  allow_type TEXT CHECK (allow_type IN ('public', 'group_based', 'everyone_in_org')) NOT NULL,
  allow_instant_result BOOLEAN DEFAULT FALSE NOT NULL,
  result_scheduled_at TIMESTAMPTZ,
  results_published BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(id, organization_id)
);

-- 5. Exam Segments
CREATE TABLE IF NOT EXISTS public.exam_segments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  order_index TEXT NOT NULL,
  requires_individual_pass BOOLEAN DEFAULT FALSE NOT NULL,
  pass_threshold_type TEXT CHECK (pass_threshold_type IN ('percentile', 'fixed', 'none')),
  pass_threshold_value NUMERIC,
  UNIQUE(id, exam_id)
);

-- 6. Questions
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
  order_index TEXT NOT NULL,
  UNIQUE(id, organization_id)
);

-- 7. Batches
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL
);

-- 8. Exam Batch Mapper
CREATE TABLE IF NOT EXISTS public.exam_batch_mapper (
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (exam_id, batch_id)
);

-- 9. Question Batch Mapper
CREATE TABLE IF NOT EXISTS public.question_batch_mapper (
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (question_id, batch_id)
);

-- 10. Batch Member Mapper
CREATE TABLE IF NOT EXISTS public.batch_member_mapper (
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(batch_id, student_id)
);

-- 11. Submissions
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  submitted_at TIMESTAMPTZ
);

-- 12. Submission Secret Data
CREATE TABLE IF NOT EXISTS public.submission_secret_data (
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  is_graded BOOLEAN DEFAULT FALSE NOT NULL,
  total_score NUMERIC
);

-- 13. Answers
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT
);

-- 14. Org Join Requests
CREATE TABLE IF NOT EXISTS public.org_join_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) NOT NULL,
  for_role TEXT CHECK (for_role IN ('manager', 'teacher', 'student')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'rejected')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(student_id, org_id)
);
