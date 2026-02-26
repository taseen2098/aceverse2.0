import { User } from "@supabase/supabase-js";

export const StaffRoles = ["owner", "manager", "teacher", "admin"] as const;
export type StaffRole = (typeof StaffRoles)[number];

export const Roles = ["admin", "owner", "manager", "teacher", "student"] as const;
export type Role = (typeof Roles)[number];

export const OrgStatuses = ["active", "suspended"] as const;
export type OrgStatus = (typeof OrgStatuses)[number];

export type QuestionType = "mcq" | "short_answer";
export type PassThresholdType = "percent" | "fixed" | "none";

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// This shouldn't be a table, rather pushed in user_metadata
export interface AceVerseUserMetadata {
  id: uid;
  email: string;
  full_name: string | null;
  avatar_link: string | null;
}

export type AceVerseUser = User & { user_metadata: AceVerseUserMetadata };
export type MiniUser = Required<Pick<AceVerseUser, "id" | "email">>;
export type uid = AceVerseUser["id"];

/**
 * @MappingRulesForAI
 * 1. tables will be created for interface with DB prefix
 * 2. UNIQUE in comments should be implemented
 * 3. CREATE TRIGGER defined above should be implemented
 * 4 All @policy and @*policy should be turned to policy
 */

/**
 * For all table
 * @policy "Admin can do anything"
 */

type JoinSystem = "public" | "request";

/**
 * @policy "Owners manage organization"
 * @policy "Teachers and Managers can SELECT organization"
 */
interface DBOrganization {
  id: string;
  name: string;
  owner_id: uid;
  status: OrgStatus;
  logo_url: string | null;
  banner_url: string | null;
  theme_color: string | null;
  join_system: JoinSystem;
  created_at: string;
}
export type Organization = Omit<DBOrganization, "owner_id">;
export type OrganizationForMembership = Omit<Organization, "created_at">;

export interface DBProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  updated_at: string;
}


/**
 * "Created by server actions after deciding in server if allowed"
 * @policy everyone in org can read this
 */
interface DBMembership {
  id: string;
  user_id: uid;
  organization_id: Organization["id"];
  member_role: Role;
  created_at: string;
  organization?: Organization["id"];
  on_free_trial: boolean;
  status: "active" | "suspended" | "pending" | "cancelled";
}

export type Membership = DBMembership & {
  organization: OrganizationForMembership;
};

export type PaymentStatus = "pending" | "success" | "failed" | "cancelled";

export interface DBPayment {
  id: string;
  membership_id: string;
  tran_id: string; // Your Order ID (sent to SSL)
  bank_tran_id: string | null; // SSL's ID (received from SSL)
  amount: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface Userfetched {
  user: MiniUser;
  memberships: Membership[];
}
// -----------------------------------------------------------
/**
 * @orgcontentpolicy - if organizations.status = 'active'
 * "Teacher/Managers within organization can do anything"
 * "Students within organization can only access"
 */

/**
 * @staffonlypolicy - if organizations.status = 'active'
 * "Teacher/Managers within organization can do anything with it"
 */

/**
 * @staffonlyreadpolicy - if organizations.status = 'active'
 * "Teacher/Managers within organization can select only"
 */

/**
 * `Students will access almost everything from server being cached`
 */

// -----------------------------------------------------------

/** @orgcontentpolicy  */
export interface DBSubject {
  // Students can access only via server actions if they have access
  id: string;
  organization_id: string;
  name: string;
  // UNIQUE(id, organization_id)
}

/** @staffonlypolicy  */
export interface DBExam {
  id: string;
  organization_id: Organization["id"]; // Linked to Org
  // UNIQUE(id, organization_id)
  title: string;
  description: string | null;
  questions_count: number; // DEFAULT: 0

  created_by: string | null;
  is_published: boolean;
  has_publishable_changes: boolean;

  duration: number;
  start_time: string | null;
  end_time: string | null;

  pass_threshold_type: PassThresholdType | null;
  pass_threshold_value: number | null;

  has_negative_marking: boolean;
  negative_marks_value: number;

  allowed_attempts: number;
  allow_type: "public" | "group_based" | "everyone_in_org";

  allow_instant_result: boolean;
  result_scheduled_at: string | null; // null if allow_instant_results
  results_published: boolean;

  created_at: string;
  updated_at: string;
}

/** @staffonlypolicy  */
export interface DBExamBatchMapper {
  organization_id: DBOrganization["id"];
  exam_id: DBExam["id"];
  batch_id: DBBatch["id"];
}

export type ExamWhileBuilding = WithRequired<
  Partial<DBExam>,
  "id" | "organization_id"
>;

export type ExamForTaking = DBExam & {
  segments: ExamSegmentForTakingExam[];
  questions: QuestionForTakingExam[];
  total_marks: number; // DEFAULT: 0
  total_questions: number; // DEFAULT: 0
};

/** @staffonlypolicy  */
export interface DBQuestion<T extends QuestionType = QuestionType> {
  id: string;
  organization_id: DBOrganization["id"];
  // UNIQUE CONSTRAINT(id, organization_id)
  subject_id: DBSubject["id"] | null;
  exam_id: DBExam["id"] | null;
  segment_id: DBExamSegment["id"] | null;

  question_text: string;
  question_type: T;
  options: T extends "mcq" ? Record<string, string> : null;
  correct_answer: T extends "mcq" ? string : null;
  marks: number; // DEFAULT: 0
  negative_marks: number | null;
  correct_feedback: string | null;
  incorrect_feedback: string | null;
  order_index?: string; // ordered using fractional-indexing framework in client/server side
}

/** @staffonlypolicy  */
export interface DBQuestionBatchMapper {
  organization_id: DBOrganization["id"];
  question_id: DBQuestion["id"];
  batch_id: DBBatch["id"];
  // UNIQUE(question_id, batch_id)
}

export type QuestionForTakingExam = Omit<
  DBQuestion,
  "correct_answer" | "correct_feedback" | "incorrect_feedback"
>;

export type QuestionWhileBuilding = WithRequired<
  Partial<DBQuestion>,
  "id" | "question_type" | "order_index"
>;

export type QuestionWhileBuildingForSingle = WithRequired<
  Partial<DBQuestion>,
  "id" | "question_type"
>;

/** @orgcontentpolicy  */
export interface DBExamSegment {
  id: string;
  organization_id: DBOrganization["id"];
  exam_id: DBExam["id"];
  // UNIQUE CONSTRAINT(id, exam_id)
  name: string;
  order_index: string;

  requires_individual_pass: boolean;
  pass_threshold_type: PassThresholdType | null;
  pass_threshold_value: number | null;
}

export type ExamSegmentForTakingExam = Omit<
  DBExamSegment,
  "requires_individual_pass" | "pass_threshold_type" | "pass_threshold_value"
>;

export type ExamSegmentWhileBuilding = WithRequired<
  Partial<DBExamSegment>,
  "id" | "exam_id" | "order_index"
>;

/** @staffonlyreadpolicy  */
export interface DBSubmission {
  id: string;
  organization_id: DBOrganization["id"];
  exam_id: DBExam["id"];
  student_member_id: AceVerseUser["id"];
  started_at: string;
  submitted_at: string | null;
  // Result Data (Merged from your SQL schema)
  total_score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  is_graded: boolean;
  graded_at: string | null;
}

/** @staffonlyreadpolicy  */
// CREATE TRIGGER: if exam.allow_instant_answer then instant grade calc
/** @staffonlyreadpolicy */
export interface DBSegmentScore {
  id: string;
  submission_id: string;
  segment_id: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  total_questions: number;
  answered: number;
  correct: number;
  incorrect: number;
  skipped: number;
}

export type SubmissionForTakingExam = DBSubmission & {
  answers?: DBAnswer[];
  previousAnswers?: DBAnswer[];
  questions: QuestionForTakingExam[];
  segments: ExamSegmentForTakingExam[];
};
/** @staffonlyreadpolicy  */
export interface DBAnswer {
  id: string;
  organization_id: DBOrganization["id"];
  submission_id: DBSubmission["id"];
  question_id: DBQuestion["id"];
  answer_text: string | null;
  // After Grading
  is_correct: boolean;
  marks_awarded: number;
  is_marked: boolean;
}

/** @staffonlypolicy  */
export interface DBBatch {
  id: string;
  organization_id: DBOrganization["id"];
  name: string;
}

/** @staffonlypolicy  */
export interface DBBatchMemberMapper {
  organization_id: DBOrganization["id"];
  batch_id: string;
  student_member_id: uid;
  // UNIQUE(batch_id, student_id)
}

/** @policy anyone can manage their own join request */
/** @orgcontentpolicy */
export interface DBOrgJoinRequest {
  id: string;
  org_id: DBOrganization["id"];
  student_id: uid;
  for_role: Omit<Role, "owner" | "admin">; // CHECK for role in Omit<Role, "owner" | "admin"> coversion for this type context
  status: "pending" | "rejected";
  created_at: string;
  // UNIQUE(student_id, org_id)
}

export interface DBAnnouncement {
  id: string; // UUID
  org_id: string; // UUID (Foreign Key to organizations)
  created_by: string; // UUID (Foreign Key to memberships)
  title: string;
  content: string;
  created_at: string; // ISO Date String
  updated_at: string; // ISO Date String
}

// For creating a new announcement (omitting generated fields)
export type CreateAnnouncement = Omit<
  DBAnnouncement,
  "id" | "created_at" | "updated_at"
>;

// For updates (all fields optional except ID)
export type UpdateAnnouncement = Partial<CreateAnnouncement> & { id: string };
