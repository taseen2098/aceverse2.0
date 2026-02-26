import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { OrgStudent, useOrgStudents } from "@/lib/hooks/useOrgStudents";
import { Trash2 } from "lucide-react";

export default function RemoveStudentDialog({
  student,
  removeStudent,
}: {
  student: OrgStudent;
  removeStudent: ReturnType<typeof useOrgStudents>["removeStudent"];
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Student?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove{" "}
            <b>{student.profile.full_name || student.profile.email}</b> from the
            organization? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => removeStudent.mutate(student.user_id)}
            className="bg-destructive hover:bg-destructive/90"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
