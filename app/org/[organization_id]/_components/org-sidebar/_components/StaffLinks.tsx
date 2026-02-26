import { BookOpen, List, PlusCircle, FileQuestion, Tags, GraduationCap, Users, BarChart } from "lucide-react";
import CollapsibleNav  from "./CollapsibleNav";
import EditExamNavLinks from "./EditExamNavLinks";
import NavLink  from "./NavLink";

export default function StaffLinks({
  pathname,
  organizationId,
  examIds,
  isCreatingExam,
  handleCloseTab,
  isCreatingQuestion,
}: {
  pathname: string;
  organizationId: string | null;
  examIds: string[];
  isCreatingExam: boolean;
  handleCloseTab: (e: React.MouseEvent, id: string) => void;
  isCreatingQuestion: boolean;
}) {
  return (
    <>
      <CollapsibleNav
        title="Exams"
        icon={BookOpen}
        active={
          pathname.startsWith(`/org/${organizationId}/exams`) || examIds.length > 0
        }
      >
        <NavLink
          href={`/org/${organizationId}/exams`}
          icon={List}
          active={pathname === `/org/${organizationId}/exams`}
          subItem
        >
          View Exams
        </NavLink>
        <NavLink
          href={`/org/${organizationId}/staff-routegrp/create-exam`}
          icon={PlusCircle}
          active={isCreatingExam}
          subItem
        >
          Create Exam
        </NavLink>
        {examIds.map((examId) => (
          <EditExamNavLinks
            key={examId}
            examId={examId}
            organizationId={organizationId as string}
            pathname={pathname}
            handleCloseTab={handleCloseTab}
          />
        ))}
      </CollapsibleNav>

      <CollapsibleNav
        title="Questions"
        icon={FileQuestion}
        active={pathname.startsWith(`/org/${organizationId}/questions`)}
      >
        <NavLink
          href={`/org/${organizationId}/questions`}
          icon={List}
          active={pathname === `/org/${organizationId}/questions`}
          subItem
        >
          View Questions
        </NavLink>
        <NavLink
          href={`/org/${organizationId}/staff-routegrp/create-question`}
          icon={PlusCircle}
          active={isCreatingQuestion}
          subItem
        >
          Create Question
        </NavLink>
      </CollapsibleNav>

      <NavLink
        href={`/org/${organizationId}/subjects`}
        icon={Tags}
        active={pathname === `/org/${organizationId}/subjects`}
      >
        Subjects
      </NavLink>

      <NavLink
        href={`/org/${organizationId}/staff-routegrp/students`}
        icon={GraduationCap}
        active={pathname === `/org/${organizationId}/staff-routegrp/students`}
      >
        Students
      </NavLink>

      <NavLink
        href={`/org/${organizationId}/staff-routegrp/manage-batches`}
        icon={Users}
        active={pathname.startsWith(`/org/${organizationId}/staff-routegrp/manage-batches`)}
      >
        Manage Batch
      </NavLink>

      <NavLink
        href={`/org/${organizationId}/staff-routegrp/results`}
        icon={BarChart}
        active={pathname.startsWith(`/org/${organizationId}/staff-routegrp/results`)}
      >
        Exam Results
      </NavLink>
    </>
  );
}