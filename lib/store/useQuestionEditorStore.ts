import {
  QuestionType,
  QuestionWhileBuildingForSingle,
} from "@/features/db-ts/objects";
import { create } from "zustand";

interface QuestionEditorState {
  question: QuestionWhileBuildingForSingle;
  updateQuestion: (delta: Partial<QuestionWhileBuildingForSingle>) => void;
  setQuestion: (question: QuestionWhileBuildingForSingle) => void;
  resetQuestion: () => void;
}

const createInitialQuestion = (): QuestionWhileBuildingForSingle => ({
  id: crypto.randomUUID(),
  question_text: "",
  question_type: "mcq" as QuestionType,
  options: { A: "", B: "", C: "", D: "" },
  correct_answer: "",
  marks: 1,
  negative_marks: 0,
  subject_id: null,
  correct_feedback: "",
  incorrect_feedback: "",
});

export const useQuestionEditorStore = create<QuestionEditorState>()((set) => ({
  question: createInitialQuestion(),

  updateQuestion: (delta) =>
    set((state) => ({
      question: { ...state.question, ...delta },
    })),

  setQuestion: (question) => set({ question }),

  resetQuestion: () =>
    set({
      question: createInitialQuestion(),
    }),
}));
