import { supabase } from "@/lib/supabase/client";

export interface StartOrResumeReturnObject {
  title: string;
  submissionId: string; // UUID
  startTime: string; // ISO Timestamp
  resumed: boolean;
  duration: number; // Minutes
  questions: ExamQuestionForStartOrResumeExam[];
  segments: ExamSegmentForStartOrResumeExam[];
  previousAnswers: Record<string, UserAnswerForStartOrResumeExam>; // Keyed by question_id (UUID)
}

// Supporting interfaces for the "Data Assembly" parts
export interface ExamQuestionForStartOrResumeExam {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "short_answer" | "boolean" | string;
  options: Record<string, string>; // Depends on your JSON structure for MCQ
  marks: number;
  segment_id: string;
  order_index: string;
}

export interface ExamSegmentForStartOrResumeExam {
  id: string;
  name: string;
  order_index: number;
}

export interface UserAnswerForStartOrResumeExam {
  answer_text: string;
  is_marked: boolean;
}

export const studentApi = {
  getExamMetadata: async (examId: string) => {
    const { data, error } = await supabase.rpc("get_public_exam_meta", {
      p_exam_id: examId,
    });
    if (error) {
      throw new Error(error.message || "Failed to fetch metadata");
    }
    return data;
  },

  syncAnswers: async (
    examId: string,
    payload: {
      submissionId: string;
      answers: { question_id: string; answer_text: string }[];
    },
  ) => {
    const res = await fetch(`/api/student/exam/${examId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || error.error || "Failed to sync answers");
    }
    return res.json();
  },

  submitExam: async (examId: string, payload: { submissionId: string }) => {
    const res = await fetch(`/api/student/exam/${examId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || error.error || "Failed to submit exam");
    }
    return res.json();
  },
};
