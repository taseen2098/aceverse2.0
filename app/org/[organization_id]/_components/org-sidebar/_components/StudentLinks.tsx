import { BookOpen, BarChart, Users, Tags, List } from "lucide-react";
import NavLink from "./NavLink";

export default function StudentLinks({
  organizationId,
  pathname,
}: {
  organizationId: string | null;
  pathname: string;
}) {
  return (
    <>
      <NavLink
        href={`/org/${organizationId}/exams`}
        icon={BookOpen}
        active={pathname.startsWith(`/org/${organizationId}/exams`)}
      >
        My Exams
      </NavLink>
      <NavLink
        href={`/org/${organizationId}/student-routegrp/my-batches`}
        icon={Users}
        active={pathname.startsWith(
          `/org/${organizationId}/student-routegrp/my-batches`,
        )}
      >
        My Batches
      </NavLink>
      <NavLink
        href={`/org/${organizationId}/questions`}
        icon={List}
        active={pathname === `/org/${organizationId}/questions`}
        subItem
      >
        Question Bank
      </NavLink>
      <NavLink
        href={`/org/${organizationId}/student-routegrp/results`}
        icon={BarChart}
        active={pathname.startsWith(
          `/org/${organizationId}/student-routegrp/results`,
        )}
      >
        My Results
      </NavLink>
      <NavLink
        href={`/org/${organizationId}/subjects`}
        icon={Tags}
        active={pathname === `/org/${organizationId}/subjects`}
      >
        Subjects
      </NavLink>
    </>
  );
}
