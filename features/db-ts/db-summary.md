# Database Schema Summary

## Schema Overview
The AceVerse database is designed for a multi-tenant examination system. It utilizes Supabase (PostgreSQL) with UUIDs for primary keys and `timestamptz` for auditing. The schema supports organizations, granular roles, fractional indexing for ordering, and automated grading.

## Table Definitions

| Table | Purpose |
| :--- | :--- |
| **organizations** | Multi-tenant root. Manages status (pending/active/suspended). |
| **profiles** | User metadata extending `auth.users`. Roles: `user`, `admin`. |
| **memberships** | Links users to orgs with roles: `primary_owner`, `manager`, `teacher`, `student`. |
| **subjects** | Academic subjects scoped to organizations. |
| **exams** | Core exam configuration (duration, marks, negative marking, access control). |
| **exam_segments** | Logical sections within an exam (e.g., Physics, Chemistry). |
| **questions** | Question bank. Can be standalone or tied to specific exams/segments. |
| **submissions** | Student exam attempts, tracking timing and scoring. |
| **answers** | Individual question responses within a submission. |
| **segment_scores** | Aggregated performance metrics per exam segment. |
| **student_groups** | Arbitrary groupings of students for access control. |
| **group_members** | Mapping of students to groups. |
| **exam_groups** | Mapping of exams to specific groups for restricted access. |
| **join_requests** | Student requests to participate in restricted exams. |

## Field Details
- **Fractional Indexing**: `order_index` (TEXT) is used in `exam_segments` and `questions` for efficient reordering.
- **Scoring**: `total_marks`, `negative_marks`, and `pass_threshold_value` use `NUMERIC` for precision.
- **JSONB**: `questions.options` stores structured MCQ choices or configuration.
- **Enums (Check Constraints)**:
  - `org.status`: `pending`, `active`, `suspended`.
  - `profile.role`: `user`, `admin`.
  - `membership.role`: `primary_owner`, `manager`, `teacher`, `student`.
  - `exam.pass_threshold_type`: `percentile`, `fixed`, `none`.
  - `question.type`: `mcq`, `short_answer`.

## Relationships
- **Hierarchical**: `Organizations` -> `Subjects`/`Exams` -> `Segments` -> `Questions`.
- **Profiles**: Centralized user identity linked via `auth.users`.
- **Access Control**: `exam_groups` joins `exams` and `student_groups` to restrict visibility.
- **Results**: `submissions` -> `answers` and `segment_scores`.

## Indexes
- **Performance**: Indexes on `organization_id` across all major tables.
- **Foreign Keys**: Indexed `user_id`, `group_id`, and `exam_id` to optimize joins.
- **Uniqueness**: 
  - `memberships(user_id, organization_id)`
  - `answers(submission_id, question_id)`
  - `segment_scores(submission_id, segment_id)`
  - `join_requests(exam_id, student_id)`

## Constraints
- **Cascade Deletes**: Most children (memberships, exams, segments, answers) delete on parent deletion.
- **Validation**: 
  - `questions`: `check_exam_id_if_not_exam_question` ensures `exam_id` is null if not an exam-specific question.
  - `exams`: `access_control_type` defaults to `public`.

## Secure Views
- **secure_questions**: Filters `correct_answer` and `feedback` based on `results_published` status or if the user is a staff member (`is_org_member_above_student`).
