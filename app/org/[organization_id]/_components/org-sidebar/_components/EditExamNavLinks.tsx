import { ExamBuilderStoreFactory } from "@/lib/store/useExamBuilderStore";
import { Edit, X } from "lucide-react";
import { useStore } from "zustand";
import NavLink from "./NavLink";

export default function EditExamNavLinks({
  examId,
  organizationId,
  pathname,
  handleCloseTab,
}: {
  examId: string;
  organizationId: string | undefined;
  pathname: string;
  handleCloseTab: (e: React.MouseEvent, id: string) => void;
}) {
  // We need to subscribe to the store to get the title
  const store =
    ExamBuilderStoreFactory.getState().createOrGetExamBuilderStore(examId);
  const title = useStore(store, (state) => state.exam.title || "Untitled Exam");

  return (
    <NavLink
      key={examId}
      href={`/org/${organizationId}/edit-exam/${examId}`}
      icon={Edit}
      active={pathname.includes(examId)}
      subItem
    >
      <div className="flex justify-between items-center w-full">
        <span className="truncate">{title}</span>
        <div
          role="button"
          aria-label="Close tab"
          onClick={(e) => handleCloseTab(e, examId)}
          className="ml-2 p-1 rounded-full hover:bg-red-100 hover:text-red-500"
        >
          <X className="h-3 w-3" />
        </div>
      </div>
    </NavLink>
  );
}
