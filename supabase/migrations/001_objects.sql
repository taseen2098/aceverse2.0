-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================= TABLES =================

-- Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended')),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Profiles (Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Memberships
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL CHECK (member_role IN ('primary_owner', 'manager', 'teacher', 'student')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, organization_id)
);

-- Subjects
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Exams
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT false,
  duration INTEGER NOT NULL, -- in minutes
  pass_threshold_type TEXT CHECK (pass_threshold_type IN ('percentile', 'fixed', 'none')),
  pass_threshold_value NUMERIC,
  has_negative_marking BOOLEAN DEFAULT false,
  negative_marks_value NUMERIC DEFAULT 0.25,
  total_marks NUMERIC,
  allowed_attempts INTEGER DEFAULT 1,
  access_control_type TEXT CHECK (access_control_type IN ('public', 'group_based')) DEFAULT 'public',
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  results_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Exam Segments
CREATE TABLE IF NOT EXISTS public.exam_segments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index TEXT, -- Fractional Indexing
  requires_individual_pass BOOLEAN DEFAULT false,
  pass_threshold_type TEXT CHECK (pass_threshold_type IN ('percentile', 'fixed', 'none')),
  pass_threshold_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Questions
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE, -- Nullable
  segment_id UUID REFERENCES public.exam_segments(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'short_answer')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  marks NUMERIC NOT NULL DEFAULT 1,
  negative_marks NUMERIC,
  correct_feedback TEXT,
  incorrect_feedback TEXT,
  order_index TEXT, -- Fractional Indexing
  is_exam_question BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  CONSTRAINT check_exam_id_if_not_exam_question CHECK ((is_exam_question = TRUE) OR (exam_id IS NULL))
);

-- Submissions
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  submitted_at TIMESTAMP WITH TIME ZONE,
  time_spent INTEGER,
  is_graded BOOLEAN DEFAULT false,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  total_score NUMERIC,
  max_score NUMERIC,
  percentage NUMERIC,
  passed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Answers
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  is_correct BOOLEAN,
  is_marked BOOLEAN DEFAULT false,
  marks_awarded NUMERIC,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(submission_id, question_id)
);

-- Segment Scores
CREATE TABLE IF NOT EXISTS public.segment_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES public.exam_segments(id) ON DELETE CASCADE,
  score NUMERIC,
  max_score NUMERIC,
  percentage NUMERIC,
  passed BOOLEAN,
  total_questions INTEGER,
  answered INTEGER,
  correct INTEGER,
  incorrect INTEGER,
  skipped INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(submission_id, segment_id)
);

-- Student Groups
CREATE TABLE IF NOT EXISTS public.student_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Group Members
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES public.student_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(group_id, user_id)
);

-- Exam Groups
CREATE TABLE IF NOT EXISTS public.exam_groups (
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.student_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  PRIMARY KEY (exam_id, group_id)
);

-- Join Requests
CREATE TABLE IF NOT EXISTS public.join_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(exam_id, student_id)
);

-- ================= INDEXES =================
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_id ON public.memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_exams_org_id ON public.exams(organization_id);
CREATE INDEX IF NOT EXISTS idx_questions_org_id ON public.questions(organization_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_groups_exam_id ON public.exam_groups(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_groups_group_id ON public.exam_groups(group_id);
