import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { examsKeys } from "@/lib/hooks/useExams";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { supabase } from "@/lib/supabase/client";
import { Exam } from "@/server/BasicStudentApi";
import { useQueryClient } from "@tanstack/react-query";
import {
  MoreVertical,
  Edit,
  EyeOff,
  Eye,
  Share2,
  GraduationCap,
  Trophy,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ExamCardButtonDropDown({
  organizationId,
  exam,
}: {
  organizationId: string;
  exam: Exam;
}) {
  const queryClient = useQueryClient();
  const membershipId = useAuthStore((state) => state.getCurrentMembership()?.id);

  const handleToggleStatus = async (examId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("exams")
        .update({ is_active: !currentStatus })
        .eq("id", examId);

      if (error) throw error;
      toast.success(currentStatus ? "Exam unpublished" : "Exam published");

      queryClient.setQueryData(
        examsKeys.byMembership(membershipId as string),
        (oldData: Exam[]) => [
          ...oldData.map((exam) =>
            exam.id === examId ? { ...exam, is_active: !currentStatus } : exam,
          ),
        ],
      );
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this exam? All associated questions and submissions will be lost.",
      )
    )
      return;

    try {
      const { error } = await supabase.from("exams").delete().eq("id", examId);

      if (error) throw error;
      toast.success("Exam deleted successfully");

      queryClient.setQueryData(
        examsKeys.byMembership(membershipId as string),
        (oldData: Exam[]) => oldData.filter((exam) => exam.id !== examId),
      );
    } catch (error) {
      toast.error("Failed to delete exam");

      console.error(error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <Link href={`/org/${organizationId}/edit-exam/${exam.id}`}>
          <DropdownMenuItem className="cursor-pointer">
            <Edit className="mr-2 h-4 w-4" /> Edit Details
          </DropdownMenuItem>
        </Link>

        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => handleToggleStatus(exam.id, !!exam.is_published)}
        >
          {exam.is_published ? (
            <>
              <EyeOff className="mr-2 h-4 w-4 text-gray-500" />

              <span className="text-gray-500">Unpublish</span>
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4 text-green-600" />

              <span className="text-green-600">Publish</span>
            </>
          )}
        </DropdownMenuItem>

        {exam.is_published && (
          <DropdownMenuItem
            className="cursor-pointer text-aceverse-blue"
            onClick={() => {
              const link = `${window.location.origin}/exam/${exam.id}`;

              navigator.clipboard.writeText(link);

              toast.success("Exam link copied!");
            }}
          >
            <Share2 className="mr-2 h-4 w-4" /> Share Link
          </DropdownMenuItem>
        )}

        <Link href={`/grading/${exam.id}`}>
          <DropdownMenuItem className="cursor-pointer text-aceverse-blue">
            <GraduationCap className="mr-2 h-4 w-4" /> Grading Panel
          </DropdownMenuItem>
        </Link>

        <Link href={`/leaderboard/${exam.id}`}>
          <DropdownMenuItem className="cursor-pointer text-amber-600">
            <Trophy className="mr-2 h-4 w-4" /> Leaderboard
          </DropdownMenuItem>
        </Link>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50"
          onClick={() => handleDeleteExam(exam.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete Exam
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
