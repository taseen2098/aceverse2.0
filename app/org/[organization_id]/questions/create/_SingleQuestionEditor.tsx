"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Plus, X, Loader2, Save, RotateCcw } from "lucide-react";
import type { QuestionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useQuestionEditorStore } from "@/lib/store/useQuestionEditorStore";
import { useSubjects } from "@/lib/hooks/useSubjects";
import { useQueryClient } from "@tanstack/react-query";

interface SingleQuestionEditorProps {
  onSuccess?: () => void;
}

export default function SingleQuestionEditor({ onSuccess }: SingleQuestionEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Get Organization ID from AuthStore
  const organizationId = useAuthStore((state) => 
    state.memberships.find(m => m.id === state.currentMembershipId)?.organization_id
  );

  // Store state
  const { question, updateQuestion, resetQuestion } = useQuestionEditorStore();
  
  // Local loading state for saving
  const [isSaving, setIsSaving] = useState(false);

  // Fetch subjects
  const { data: subjects = [], isLoading: subjectsLoading } = useSubjects(organizationId as string);

  const options = (question.options as Record<string, string>) || {};
  const optionKeys = Object.keys(options).sort();

  const handleOptionChange = (key: string, value: string) => {
    updateQuestion({ options: { ...options, [key]: value } });
  };

  const addOption = () => {
    if (optionKeys.length >= 10) return;
    const nextKey = String.fromCharCode(65 + optionKeys.length);
    updateQuestion({ options: { ...options, [nextKey]: "" } });
  };

  const removeOption = (keyToRemove: string) => {
    const newOptions: Record<string, string> = {};
    let idx = 0;
    let newCorrect = question.correct_answer;
    optionKeys.forEach((k) => {
      if (k !== keyToRemove) {
        const nk = String.fromCharCode(65 + idx++);
        newOptions[nk] = options[k];
        if (question.correct_answer === k) newCorrect = nk;
      }
    });
    if (question.correct_answer === keyToRemove) newCorrect = "";
    updateQuestion({ options: newOptions, correct_answer: newCorrect });
  };

  const handleSave = async () => {
    if (!organizationId) {
      toast.error('Organization context not found.');
      return;
    }

    if (!question.question_text || !question.subject_id) {
      toast.error('Question text and subject are required.');
      return;
    }

    if (question.question_type === 'mcq') {
      const emptyOptions = Object.values(options).some(v => !v || v.trim() === '');
      if (emptyOptions) {
        toast.error('All options must be non-empty.');
        return;
      }
      if (!question.correct_answer) {
        toast.error('Please select a correct answer.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('questions').upsert([
        {
          ...question,
          organization_id: organizationId,
          is_exam_question: false,
          exam_id: question.exam_id || null, // Keep existing exam_id if any
          order_index: question.order_index || 0,
        },
      ]);

      if (error) throw error;

      toast.success(question.created_at ? 'Question updated successfully!' : 'Question created successfully!');
      
      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['questions', organizationId] });

      if (onSuccess) {
        onSuccess();
      } else {
        resetQuestion(); // Clear persisted state after successful save
        router.push(`/org/${organizationId}/questions`);
      }
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="mb-4 relative border-none shadow-md overflow-visible bg-white group transition-shadow hover:shadow-lg max-w-3xl mx-auto">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />

      <CardContent className="p-6 pt-2 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start pt-4">
          <div className="flex-1 w-full flex gap-3">
            <Textarea
              className="flex-1 min-h-[50px] text-base border-none border-b-2 border-transparent focus-visible:border-primary rounded-none px-0 py-2 transition-colors focus-visible:ring-0 resize-none bg-transparent"
              value={question.question_text || ""}
              onChange={(e) => updateQuestion({ question_text: e.target.value })}
              placeholder="Type your question here..."
            />
          </div>

          <div className="w-full md:w-48">
            <Select
              value={question.question_type || "mcq"}
              onValueChange={(v) => updateQuestion({ question_type: v as QuestionType })}
            >
              <SelectTrigger className="h-10 text-sm border-gray-200">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">Multiple Choice</SelectItem>
                <SelectItem value="short_answer">Short Answer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center border-t border-gray-50 pt-4">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Subject
            </Label>
            <Select
              value={question.subject_id || ""}
              onValueChange={(v) => updateQuestion({ subject_id: v })}
            >
              <SelectTrigger className="h-8 text-xs w-36 bg-gray-50 border-none shadow-none">
                <SelectValue placeholder={subjectsLoading ? "Loading..." : "Select Subject"} />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Marks
            </Label>
            <Input
              className="h-8 w-14 text-sm text-center bg-gray-50 border-none shadow-none"
              type="number"
              value={question.marks || 1}
              onChange={(e) => updateQuestion({ marks: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              Neg Marks
            </Label>
            <Input
              className="h-8 w-18 text-sm text-center bg-gray-50 border-none shadow-none text-red-500"
              type="number"
              value={question.negative_marks || 0}
              onChange={(e) =>
                updateQuestion({ negative_marks: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>

        {question.question_type === "mcq" && (
          <div className="space-y-3 pt-2">
            {optionKeys.map((k) => (
              <div key={k} className="flex items-center gap-3 group/opt">
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all",
                    question.correct_answer === k
                      ? "border-primary bg-primary"
                      : "border-gray-300 hover:border-primary/50",
                  )}
                  onClick={() => updateQuestion({ correct_answer: k })}
                >
                  {question.correct_answer === k && (
                    <div className="h-2 w-2 bg-white rounded-full" />
                  )}
                </div>
                <span className="text-xs font-bold text-gray-400 w-4">{k}.</span>
                <Input
                  className="h-9 text-sm flex-1 border-none border-b border-transparent focus-visible:border-gray-200 rounded-none px-0 focus-visible:ring-0 bg-transparent transition-colors"
                  value={options[k]}
                  onChange={(e) => handleOptionChange(k, e.target.value)}
                  placeholder={`Option ${k}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(k)}
                  className="h-8 w-8 opacity-0 group-hover/opt:opacity-100 text-gray-300 hover:text-destructive transition-all"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={addOption}
              className="text-primary hover:bg-primary/5 px-0 h-10 w-full justify-start font-medium border-t border-dashed border-gray-100 rounded-none mt-2"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Option
            </Button>
          </div>
        )}

        {question.question_type === "short_answer" && (
          <div className="pt-2">
            <Input
              className="h-10 text-sm border-none border-b-2 border-dashed border-gray-200 focus-visible:border-primary rounded-none px-0 focus-visible:ring-0 bg-transparent"
              value={question.correct_answer || ""}
              onChange={(e) => updateQuestion({ correct_answer: e.target.value })}
              placeholder="Enter exact correct answer..."
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-50 opacity-60 hover:opacity-100 transition-opacity">
          <div>
            <Label className="text-[9px] text-gray-400 font-bold uppercase">
              Correct Feedback
            </Label>
            <Input
              className="h-8 text-xs border-none bg-green-50/20 focus-visible:bg-green-50/40"
              value={question.correct_feedback || ""}
              onChange={(e) => updateQuestion({ correct_feedback: e.target.value })}
              placeholder="e.g. Correct! Great job."
            />
          </div>
          <div>
            <Label className="text-[9px] text-gray-400 font-bold uppercase">
              Incorrect Feedback
            </Label>
            <Input
              className="h-8 text-xs border-none bg-red-50/20 focus-visible:bg-red-50/40"
              value={question.incorrect_feedback || ""}
              onChange={(e) => updateQuestion({ incorrect_feedback: e.target.value })}
              placeholder="e.g. Almost! The answer is..."
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t border-gray-50 p-6 flex gap-3">
        <Button 
          variant="outline"
          onClick={resetQuestion}
          disabled={isSaving}
          className="flex-1 border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Discard
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="flex-[2] bg-aceverse-blue hover:bg-aceverse-blue/90 text-white font-semibold h-11"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" /> Save Question
        </Button>
      </CardFooter>
    </Card>
  );
}