import { create } from "zustand";
import {
  ExamQuestionForStartOrResumeExam,
  ExamSegmentForStartOrResumeExam,
  UserAnswerForStartOrResumeExam,
} from "../functions/student-client";

type Metadata = {
  id: string; // UUID
  title: string;
  description: string;
  duration: number; // Duration in minutes
  questionCount: number;
  endTime: ISO8601String;
};

// Helper for strict string validation
type ISO8601String = string;

interface StudentExamState {
  // Metadata
  examId: string | null;
  submissionId: string | null;
  startTime: string | null; // ISO string

  title: string;
  instruction: string;
  duration: number; // minutes
  questionCount: number;

  // Content
  questions: ExamQuestionForStartOrResumeExam[];
  segments: ExamSegmentForStartOrResumeExam[];

  // State
  answers: Record<string, string>; // questionId -> answer
  markedQuestions: Set<string>; // questionIds flagged for review
  dirtyAnswerIds: Set<string>; // Set of questionIds that need syncing
  activeQuestionId: string | null;
  activeSegmentId: string | null;
  isNavOpen: boolean;

  // Status
  status: "idle" | "loading" | "active" | "submitting" | "submitted" | "error";
  syncStatus: "idle" | "syncing" | "error";
  lastSyncTime: string | null;
  error: string | null;

  // Actions
  initialize: (examId: string) => void;
  setMetadata: (data: Metadata) => void;
  setSubmission: (id: string, start: string) => void;
  setContent: (
    questions: ExamQuestionForStartOrResumeExam[],
    segments: ExamSegmentForStartOrResumeExam[],
    initialAnswers: Record<string, UserAnswerForStartOrResumeExam>,
  ) => void;
  setAnswer: (questionId: string, answer: string) => void;
  toggleMarked: (questionId: string) => void;
  markSynced: (syncedIds: string[]) => void;
  setSyncStatus: (status: "idle" | "syncing" | "error") => void;
  setStatus: (status: StudentExamState["status"]) => void;
  setError: (msg: string | null) => void;
  setActiveQuestionId: (id: string | null) => void;
  setActiveSegmentId: (id: string | null) => void;
  setIsNavOpen: (open: boolean) => void;
  reset: () => void;

  getAnsweredCount: () => number;
  getSkippedCount: () => number;
}

export const useStudentExamStore = create<StudentExamState>()((set, get) => ({
  examId: null,
  submissionId: null,
  startTime: null,
  duration: 0,
  title: "",
  questionCount: 0,
  instruction: "",
  questions: [],
  segments: [],
  answers: {},
  markedQuestions: new Set(),
  dirtyAnswerIds: new Set(),
  activeQuestionId: null,
  activeSegmentId: null,
  isNavOpen: false,
  status: "idle",
  syncStatus: "idle",
  lastSyncTime: null,
  error: null,

  initialize: (examId) => set({ examId, error: null }),

  setMetadata: (data) =>
    set({
      title: data.title,
      duration: data.duration,
      questionCount: data.questionCount,
      instruction: data.description,
    }),

  setSubmission: (id, start) =>
    set({
      submissionId: id,
      startTime: start,
      status: "active",
    }),

  setContent: (questions, segments, initialAnswers) =>
    set((state) => {
      const mergedAnswers: Record<string, string> = {};
      const markedFromRemote = new Set<string>();

      // initialAnswers is Record<string, { answer_text: string, is_marked: boolean }> from API
      Object.entries(initialAnswers).forEach(([qId, data]) => {
        mergedAnswers[qId] = data.answer_text || "";
        if (data.is_marked) markedFromRemote.add(qId);
      });

      // Overlay local dirty answers
      state.dirtyAnswerIds.forEach((qId) => {
        if (state.answers[qId] !== undefined) {
          mergedAnswers[qId] = state.answers[qId];
        }
      });

      const activeSegId =
        state.activeSegmentId || (segments.length > 0 ? segments[0].id : null);

      return {
        questions,
        segments,
        answers: mergedAnswers,
        markedQuestions:
          markedFromRemote.size > 0 ? markedFromRemote : state.markedQuestions,
        activeSegmentId: activeSegId,
      };
    }),

  setAnswer: (questionId, answer) =>
    set((state) => {
      const newDirty = new Set(state.dirtyAnswerIds);
      newDirty.add(questionId);
      return {
        answers: { ...state.answers, [questionId]: answer },
        dirtyAnswerIds: newDirty,
      };
    }),

  toggleMarked: (questionId) =>
    set((state) => {
      const next = new Set(state.markedQuestions);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);

      // Also mark as dirty so it syncs to DB
      const newDirty = new Set(state.dirtyAnswerIds);
      newDirty.add(questionId);

      return { markedQuestions: next, dirtyAnswerIds: newDirty };
    }),

  markSynced: (syncedIds) =>
    set((state) => {
      const newDirty = new Set(state.dirtyAnswerIds);
      syncedIds.forEach((id) => newDirty.delete(id));
      return {
        dirtyAnswerIds: newDirty,
        lastSyncTime: new Date().toISOString(),
        syncStatus: "idle",
      };
    }),

  setSyncStatus: (s) => set({ syncStatus: s }),
  setStatus: (s) => set({ status: s }),
  setError: (msg) => set({ error: msg }),
  setActiveQuestionId: (id) => set({ activeQuestionId: id }),
  setActiveSegmentId: (id) => set({ activeSegmentId: id }),
  setIsNavOpen: (open) => set({ isNavOpen: open }),

  getAnsweredCount: () => {
    const { answers, questions } = get();
    return questions.filter(({ id }) => answers[id] && answers[id].trim() !== "")
      .length;
  },
  getSkippedCount: () => {
    const { answers, questions } = get();
    return questions.filter(({ id }) => !answers[id] || answers[id].trim() === "")
      .length;
  },

  reset: () =>
    set({
      examId: null,
      submissionId: null,
      startTime: null,
      questions: [],
      segments: [],
      answers: {},
      markedQuestions: new Set(),
      dirtyAnswerIds: new Set(),
      activeQuestionId: null,
      activeSegmentId: null,
      isNavOpen: false,
      status: "idle",
      syncStatus: "idle",
      error: null,
    }),
}));
