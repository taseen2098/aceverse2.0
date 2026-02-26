import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useExamSave } from "@/lib/hooks/useExamSave";
import { ExamBuilderStoreFactory } from "@/lib/store/useExamBuilderStore";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function DialogForClosingEditableExam({
  examId,
  onClose,
  onConfirm,
}: {
  examId: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!examId) return null;
  return (
    <TabCloseDialogInner examId={examId} onClose={onClose} onConfirm={onConfirm} />
  );
}

function TabCloseDialogInner({
  examId,
  onClose,
  onConfirm,
}: {
  examId: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { handleSave, confirmExit, loading } = useExamSave(examId);

  const handleSaveAndExit = async () => {
    const success = await handleSave(true);
    if (success) {
      ExamBuilderStoreFactory.getState().deleteExamBuilderStore(examId);
      onConfirm();
    }
  };

  const handleDiscardAndExit = () => {
    confirmExit();
    // We manually delete here just in case confirmExit doesn't do it immediately or we want to be sure
    ExamBuilderStoreFactory.getState().deleteExamBuilderStore(examId);
    onConfirm();
  };

  return (
    <AlertDialog open={true} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            This exam has unsaved changes. Would you like to save them before closing
            the tab?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onClose} className="sm:mt-0">
            Cancel
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={handleDiscardAndExit}
            className="text-red-600 border-red-200 hover:bg-red-50"
            disabled={loading}
          >
            Discard & Close
          </Button>
          <Button
            onClick={handleSaveAndExit}
            className="bg-aceverse-navy hover:bg-aceverse-navy/90 text-white"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Exit
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
