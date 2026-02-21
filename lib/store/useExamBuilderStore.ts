import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { useOrgRealtimeStore } from "./useOrgRealtimeStore";

import { OrgRealtimeManager } from "@/lib/logic/OrgRealtimeManager";
import {
  ExamWhileBuilding,
  ExamSegmentWhileBuilding,
  QuestionWhileBuilding,
  DBQuestion,
} from "@/features/db-ts/objects";

// Types needed for Realtime/Dirty State
export interface RealtimePayload {
  exam?: Partial<ExamWhileBuilding>;
  segments?: Partial<ExamSegmentWhileBuilding>[];
  questions?: QuestionWhileBuilding[];
  assignedGroupIds?: string[];
  deletedQuestionIds?: string[];
  deletedSegmentIds?: string[];
  questionIds?: string[]; // Added for ordering sync
  segmentIds?: string[]; // Added for ordering sync
  senderId?: string;
}

export interface DirtyState {
  exam: Partial<ExamWhileBuilding>;
  segments: Record<string, Partial<ExamSegmentWhileBuilding>>;
  questions: Record<string, Partial<QuestionWhileBuilding>>;
  assignedGroupIds: string[] | null;
  questionIds: string[] | null; // Added for ordering sync
  segmentIds: string[] | null; // Added for ordering sync
}

export interface ExamBuilderState {
  exam: Partial<ExamWhileBuilding>;
  segments: ExamSegmentWhileBuilding[];
  questionsById: Record<string, QuestionWhileBuilding>;
  questionIds: string[];
  assignedGroupIds: string[];

  // Lifecycle
  isInitialized: boolean;

  // Realtime Manager (owned by store)
  manager: OrgRealtimeManager | null;

  // Original state for revert/comparison
  originalExam: Partial<ExamWhileBuilding>;
  originalSegments: Record<string, Partial<ExamSegmentWhileBuilding>>;
  originalQuestions: Record<string, Partial<QuestionWhileBuilding>>;
  originalAssignedGroupIds: string[];

  // Deletions
  deletedQuestionIds: string[];
  deletedSegmentIds: string[];

  // Clipboard
  clipboard: QuestionWhileBuilding | null;

  // Dirty Tracking
  dirtyState: DirtyState;
  _isDirty: boolean;

  // Realtime / Collaboration
  remoteDirtyData: RealtimePayload | null;
  isRemoteDirty: boolean;

  // for cache
  haspublishableChanges: boolean;

  // Actions
  setExam: (exam: Partial<ExamWhileBuilding>) => void;
  setSegments: (segments: ExamSegmentWhileBuilding[]) => void;
  addQuestion: (question: QuestionWhileBuilding, index?: number) => void;
  updateQuestion: (id: string, delta: Partial<QuestionWhileBuilding>) => void;
  deleteQuestion: (id: string) => void;
  reorderQuestions: (newIds: string[]) => void;
  setQuestions: (questions: QuestionWhileBuilding[]) => void;
  setAssignedGroupIds: (groupIds: string[]) => void;
  setClipboard: (question: QuestionWhileBuilding | null) => void;
  deleteSegment: (id: string) => void;

  setInitialData: (
    exam: Partial<ExamWhileBuilding>,
    segments: ExamSegmentWhileBuilding[],
    questions: QuestionWhileBuilding[],
    assignedGroupIds?: string[],
  ) => void;

  reset: () => void;
  getQuestionsArray: () => QuestionWhileBuilding[];
  isDirty: () => boolean;
  markClean: () => void;

  // Realtime Actions
  setRemoteData: (payload: RealtimePayload) => void;
  markRemoteAsDirty: (payload: RealtimePayload) => void;
  acknowledgeSavedItems: (
    savedExam: Partial<ExamWhileBuilding> | null,
    savedSegments: Partial<ExamSegmentWhileBuilding>[],
    savedQuestions: DBQuestion[],
    savedGroups: string[] | null,
  ) => void;
}

const createExamBuilderStore = () =>
  create<ExamBuilderState>()(
    subscribeWithSelector((set, get) => ({
      exam: {},
      segments: [],
      questionsById: {},
      questionIds: [],
      assignedGroupIds: [],
      isInitialized: false,
      manager: null,
      originalExam: {},
      originalSegments: {},
      originalQuestions: {},
      originalAssignedGroupIds: [],
      deletedQuestionIds: [],
      deletedSegmentIds: [],
      clipboard: null,

      dirtyState: {
        exam: {},
        segments: {},
        questions: {},
        assignedGroupIds: null,
        questionIds: null,
        segmentIds: null,
      },
      _isDirty: false,

      remoteDirtyData: null,
      isRemoteDirty: false,

      haspublishableChanges: false,

      // Actions
      setInitialData: (exam, segments, questions, assignedGroupIds = []) => {
        console.log(`Store: Initializing data for exam ${exam.id}...`);
        const originalQuestionsById: Record<string, QuestionWhileBuilding> = {};
        const originalSegmentsById: Record<string, ExamSegmentWhileBuilding> = {};
        const questionsById: Record<string, QuestionWhileBuilding> = {};
        const questionIds: string[] = [];

        // Sort questions by order_index (lexicographical)
        const sortedQuestions = [...questions].sort((a, b) =>
          a.order_index < b.order_index ? -1 : a.order_index > b.order_index ? 1 : 0,
        );

        sortedQuestions.forEach((question) => {
          if (question.id) {
            originalQuestionsById[question.id] = JSON.parse(
              JSON.stringify(question),
            );
            questionsById[question.id] = question;
            questionIds.push(question.id);
          }
        });

        // Sort segments by order_index (lexicographical)
        const sortedSegments = [...segments].sort((a, b) =>
          a.order_index < b.order_index ? -1 : a.order_index > b.order_index ? 1 : 0,
        );

        sortedSegments.forEach((segment) => {
          if (segment.id)
            originalSegmentsById[segment.id] = JSON.parse(JSON.stringify(segment));
        });

        // Ensure realtime is connected for this organization
        let manager = null;
        if (exam.organization_id) {
          const orgRealtimeStore = useOrgRealtimeStore.getState();
          orgRealtimeStore.connect(exam.organization_id);
          manager = orgRealtimeStore.manager;
        }

        // MERGE LOGIC: If we received remote changes while we were uninitialized, apply them now!
        const pendingRemoteChanges = get().remoteDirtyData;
        let mergedExam = { ...exam };
        const mergedQuestionsById = { ...questionsById };
        let mergedQuestionIds = [...questionIds];
        const mergedSegments = [...sortedSegments];

        if (pendingRemoteChanges) {
          console.log(
            `Store Init: Applying background remote changes to initial state for ${exam.id}`,
            pendingRemoteChanges,
          );
          if (pendingRemoteChanges.exam)
            mergedExam = { ...mergedExam, ...pendingRemoteChanges.exam };
          if (pendingRemoteChanges.questions) {
            pendingRemoteChanges.questions.forEach((question) => {
              if (question.id) {
                if (!mergedQuestionsById[question.id])
                  mergedQuestionIds.push(question.id);
                mergedQuestionsById[question.id] = {
                  ...mergedQuestionsById[question.id],
                  ...question,
                };
              }
            });
          }
          if (pendingRemoteChanges.questionIds)
            mergedQuestionIds = pendingRemoteChanges.questionIds;
          // Deletions
          if (pendingRemoteChanges.deletedQuestionIds) {
            pendingRemoteChanges.deletedQuestionIds.forEach((id) => {
              delete mergedQuestionsById[id];
              mergedQuestionIds = mergedQuestionIds.filter((qid) => qid !== id);
            });
          }
        }

        set({
          exam: mergedExam,
          segments: mergedSegments,
          questionsById: mergedQuestionsById,
          questionIds: mergedQuestionIds,
          assignedGroupIds,
          isInitialized: true,
          manager,
          originalExam: JSON.parse(JSON.stringify(exam)),
          originalSegments: originalSegmentsById,
          originalQuestions: originalQuestionsById,
          originalAssignedGroupIds: [...assignedGroupIds],
          deletedQuestionIds: [],
          deletedSegmentIds: [],
          dirtyState: {
            exam: {},
            segments: {},
            questions: {},
            assignedGroupIds: null,
            questionIds: null,
            segmentIds: null,
          },
          _isDirty: false,
          isRemoteDirty: !!pendingRemoteChanges,
        });
      },

      setExam: (exam) =>
        set((state) => ({
          exam: { ...state.exam, ...exam },
          dirtyState: {
            ...state.dirtyState,
            exam: { ...state.dirtyState.exam, ...exam },
          },
          _isDirty: true,
        })),

      setSegments: (segments) =>
        set((state) => {
          const newDirtySegments = { ...state.dirtyState.segments };
          segments.forEach((segment) => {
            if (segment.id)
              newDirtySegments[segment.id] = {
                ...newDirtySegments[segment.id],
                ...segment,
              };
          });
          const newSegmentIds = segments.map((segment) => segment.id!);
          return {
            segments,
            dirtyState: {
              ...state.dirtyState,
              segments: newDirtySegments,
              segmentIds: newSegmentIds,
            },
            _isDirty: true,
          };
        }),

      addQuestion: (question, index) =>
        set((state) => {
          const newQuestionsById = {
            ...state.questionsById,
            [question.id!]: question,
          };
          const newQuestionIds = [...state.questionIds];
          if (typeof index === "number" && index >= 0) {
            newQuestionIds.splice(index, 0, question.id!);
          } else {
            newQuestionIds.push(question.id!);
          }

          const newDirtyQuestions = {
            ...state.dirtyState.questions,
            [question.id!]: question,
          };

          return {
            questionsById: newQuestionsById,
            questionIds: newQuestionIds,
            dirtyState: {
              ...state.dirtyState,
              questions: newDirtyQuestions,
              questionIds: newQuestionIds,
            },
            _isDirty: true,
          };
        }),

      updateQuestion: (id, delta) =>
        set((state) => {
          const current = state.questionsById[id];
          if (!current) return {};

          const newDirtyQuestions = {
            ...state.dirtyState.questions,
            [id]: { ...state.dirtyState.questions[id], ...delta },
          };

          return {
            questionsById: {
              ...state.questionsById,
              [id]: { ...current, ...delta },
            },
            dirtyState: { ...state.dirtyState, questions: newDirtyQuestions },
            _isDirty: true,
          };
        }),

      deleteQuestion: (id) =>
        set((state) => {
          const newQuestionsById = { ...state.questionsById };
          delete newQuestionsById[id];

          const newQuestionIds = state.questionIds.filter((qid) => qid !== id);
          const newDirtyQuestions = { ...state.dirtyState.questions };
          delete newDirtyQuestions[id];

          return {
            questionsById: newQuestionsById,
            questionIds: newQuestionIds,
            deletedQuestionIds: !id.includes("-temp-")
              ? [...state.deletedQuestionIds, id]
              : state.deletedQuestionIds,
            dirtyState: {
              ...state.dirtyState,
              questions: newDirtyQuestions,
              questionIds: newQuestionIds,
            },
            _isDirty: true,
          };
        }),

      reorderQuestions: (newIds) =>
        set((state) => {
          return {
            questionIds: newIds,
            dirtyState: { ...state.dirtyState, questionIds: newIds },
            _isDirty: true,
          };
        }),

      setQuestions: (questions) => {
        const questionsById: Record<string, QuestionWhileBuilding> = {};
        const questionIds: string[] = [];
        questions.forEach((question) => {
          if (question.id) {
            questionsById[question.id] = question;
            questionIds.push(question.id);
          }
        });
        set((state) => ({
          questionsById,
          questionIds,
          _isDirty: true,
          dirtyState: { ...state.dirtyState, questionIds },
        }));
      },

      setAssignedGroupIds: (assignedGroupIds) =>
        set((state) => ({
          assignedGroupIds,
          dirtyState: { ...state.dirtyState, assignedGroupIds },
          _isDirty: true,
        })),

      setClipboard: (clipboard) => set({ clipboard }),

      deleteSegment: (id) =>
        set((state) => {
          const newDirtySegments = { ...state.dirtyState.segments };
          delete newDirtySegments[id];

          const newSegments = state.segments.filter((segment) => segment.id !== id);
          const newSegmentIds = newSegments.map((segment) => segment.id!);

          return {
            segments: newSegments,
            deletedSegmentIds: !id.includes("-temp-")
              ? [...state.deletedSegmentIds, id]
              : state.deletedSegmentIds,
            dirtyState: {
              ...state.dirtyState,
              segments: newDirtySegments,
              segmentIds: newSegmentIds,
            },
            _isDirty: true,
          };
        }),

      reset: () =>
        set({
          exam: {},
          segments: [],
          questionsById: {},
          questionIds: [],
          assignedGroupIds: [],
          isInitialized: false,
          manager: null,
          originalExam: {},
          originalSegments: {},
          originalQuestions: {},
          originalAssignedGroupIds: [],
          deletedQuestionIds: [],
          deletedSegmentIds: [],
          clipboard: null,
          dirtyState: {
            exam: {},
            segments: {},
            questions: {},
            assignedGroupIds: null,
            questionIds: null,
            segmentIds: null,
          },
          _isDirty: false,
          remoteDirtyData: null,
          isRemoteDirty: false,
        }),

      getQuestionsArray: () => {
        const state = get();
        return state.questionIds
          .map((id) => state.questionsById[id])
          .filter(Boolean);
      },

      isDirty: () => get()._isDirty,
      markClean: () => set({ _isDirty: false }),

      // --- Realtime / Collaboration Actions ---

      setRemoteData: (payload) =>
        set((state) => {
          console.log(
            `Store: Applying remote data for exam ${payload.exam?.id}`,
            payload,
          );
          const newQuestionsById = { ...state.questionsById };
          let newQuestionIds = payload.questionIds || [...state.questionIds];
          const newSegments = [...state.segments];

          // Handle Questions
          if (payload.questions) {
            payload.questions.forEach((question) => {
              if (question.id) {
                if (
                  !newQuestionsById[question.id] &&
                  !newQuestionIds.includes(question.id)
                ) {
                  newQuestionIds.push(question.id);
                }
                newQuestionsById[question.id] = {
                  ...newQuestionsById[question.id],
                  ...question,
                };
              }
            });
          }

          // Handle Deletions
          if (payload.deletedQuestionIds) {
            payload.deletedQuestionIds.forEach((id) => {
              delete newQuestionsById[id];
              newQuestionIds = newQuestionIds.filter((qid) => qid !== id);
            });
          }

          // Handle Segments
          if (payload.segments) {
            payload.segments.forEach((segment) => {
              const existingSegmentIndex = newSegments.findIndex(
                (seg) => seg.id === segment.id,
              );
              if (existingSegmentIndex !== -1) {
                newSegments[existingSegmentIndex] = {
                  ...newSegments[existingSegmentIndex],
                  ...segment,
                } as ExamSegmentWhileBuilding;
              } else if (segment.id) {
                newSegments.push(segment as ExamSegmentWhileBuilding);
              }
            });
          }

          if (payload.segmentIds) {
            newSegments.sort(
              (segmentA, segmentB) =>
                payload.segmentIds!.indexOf(segmentA.id!) -
                payload.segmentIds!.indexOf(segmentB.id!),
            );
          }

          // Handle Exam Meta
          const newExam = { ...state.exam, ...(payload.exam || {}) };

          return {
            questionsById: newQuestionsById,
            questionIds: newQuestionIds,
            segments: newSegments,
            exam: newExam,
            remoteDirtyData: payload,
            isRemoteDirty: false,
          };
        }),

      markRemoteAsDirty: (payload) =>
        set((state) => {
          console.log(`Store: Promoting remote data to DIRTY for saving`, payload);
          const newDirtyExam = { ...state.dirtyState.exam, ...(payload.exam || {}) };
          const newDirtyQuestions = { ...state.dirtyState.questions };
          const newDirtySegments = { ...state.dirtyState.segments };

          payload.questions?.forEach((question) => {
            if (question.id)
              newDirtyQuestions[question.id] = {
                ...newDirtyQuestions[question.id],
                ...question,
              };
          });

          payload.segments?.forEach((segment) => {
            if (segment.id)
              newDirtySegments[segment.id] = {
                ...newDirtySegments[segment.id],
                ...segment,
              };
          });

          const deletedQuestionsSet = [
            ...new Set([
              ...state.deletedQuestionIds,
              ...(payload.deletedQuestionIds || []),
            ]),
          ];
          const deletedSegmentsSet = [
            ...new Set([
              ...state.deletedSegmentIds,
              ...(payload.deletedSegmentIds || []),
            ]),
          ];

          return {
            dirtyState: {
              ...state.dirtyState,
              exam: newDirtyExam,
              questions: newDirtyQuestions,
              segments: newDirtySegments,
              assignedGroupIds:
                payload.assignedGroupIds || state.dirtyState.assignedGroupIds,
              questionIds: payload.questionIds || state.dirtyState.questionIds,
              segmentIds: payload.segmentIds || state.dirtyState.segmentIds,
            },
            deletedQuestionIds: deletedQuestionsSet,
            deletedSegmentIds: deletedSegmentsSet,
            _isDirty: true,
            isRemoteDirty: true,
          };
        }),

      acknowledgeSavedItems: (
        savedExam,
        savedSegments,
        savedQuestions,
        savedGroups,
      ) =>
        set((state) => {
          const newDirtyExam = { ...state.dirtyState.exam };
          const newDirtyQuestions = { ...state.dirtyState.questions };
          savedQuestions.forEach((q) => {
            if (q.id) delete newDirtyQuestions[q.id];
          });
          const newDirtySegments = { ...state.dirtyState.segments };
          savedSegments.forEach((s) => {
            if (s.id) delete newDirtySegments[s.id];
          });

          const isStillDirty =
            Object.keys(newDirtyQuestions).length > 0 ||
            Object.keys(newDirtySegments).length > 0 ||
            (Object.keys(state.dirtyState.exam).length > 0 && !savedExam);

          return {
            dirtyState: {
              ...state.dirtyState,
              exam: savedExam ? {} : newDirtyExam,
              questions: newDirtyQuestions,
              segments: newDirtySegments,
              assignedGroupIds: savedGroups
                ? null
                : state.dirtyState.assignedGroupIds,
              questionIds: isStillDirty ? state.dirtyState.questionIds : [],
              segmentIds: isStillDirty ? state.dirtyState.segmentIds : [],
            },
            deletedQuestionIds: [],
            deletedSegmentIds: [],
            _isDirty: isStillDirty,
            isRemoteDirty: false,
            remoteDirtyData: null,
          };
        }),
    })),
  );

type ExamBuilderStoreFactoryState = {
  stores: Map<string, ReturnType<typeof createExamBuilderStore>>;
  createOrGetExamBuilderStore: (
    examId: string,
  ) => ReturnType<typeof createExamBuilderStore>;
  deleteExamBuilderStore: (examId: string) => void;
  renameExamBuilderStore: (oldId: string, newId: string) => void;
  getAllExamBuilderStores: () => ReturnType<typeof createExamBuilderStore>[];
  checkAnyStoreDirty: () => boolean;
};

export const ExamBuilderStoreFactory = create<ExamBuilderStoreFactoryState>()(
  devtools((set, get) => ({
    stores: new Map<string, ReturnType<typeof createExamBuilderStore>>(),
    createOrGetExamBuilderStore: (examId: string) => {
      const currentStores = get().stores;
      if (!currentStores.has(examId)) {
        const newMap = new Map(currentStores);
        newMap.set(examId, createExamBuilderStore());
        set({ stores: newMap });
        return newMap.get(examId)!;
      } else {
        return currentStores.get(examId)!;
      }
    },

    deleteExamBuilderStore: (examId: string) => {
      if (get().stores.has(examId)) {
        const newMap = new Map(get().stores);
        newMap.delete(examId);
        set({ stores: newMap });
        console.log(`Deleted store for examId: ${examId}`);

        // If no more exam builder stores exist, disconnect realtime
        if (newMap.size === 0) {
          useOrgRealtimeStore.getState().disconnect();
        }
      }
    },

    renameExamBuilderStore: (oldId: string, newId: string) => {
      if (get().stores.has(oldId) && oldId !== newId) {
        const stores = get().stores;
        const store = stores.get(oldId)!;
        stores.set(newId, store);
        stores.delete(oldId);
        console.log(`Migrated store from ${oldId} to ${newId}`);
      }
    },

    getAllExamBuilderStores: () => {
      return Array.from(get().stores.values());
    },

    checkAnyStoreDirty: () => {
      for (const store of get().stores.values()) {
        if (store.getState().isDirty()) {
          return true;
        }
      }
      return false;
    },
  })),
);

// export const deleteExamBuilderStore = (examId: string) => {
//   if (ExamBuilderStoreFactory.getState().stores.has(examId)) {
//     ExamBuilderStoreFactory.getState().stores.delete(examId);
//     console.log(`Deleted store for examId: ${examId}`);

//     // If no more exam builder stores exist, disconnect realtime
//     if (ExamBuilderStoreFactory.getState().stores.size === 0) {
//       useOrgRealtimeStore.getState().disconnect();
//     }
//   }
// };

// export const renameExamBuilderStore = (oldId: string, newId: string) => {
//   if (ExamBuilderStoreFactory.getState().stores.has(oldId) && oldId !== newId) {
//     const stores = ExamBuilderStoreFactory.getState().stores;
//     const store = stores.get(oldId)!;
//     stores.set(newId, store);
//     stores.delete(oldId);
//     console.log(`Migrated store from ${oldId} to ${newId}`);
//   }
// };

// export const getAllExamBuilderStores = () => {
//   return Array.from(ExamBuilderStoreFactory.getState().stores.values());
// };

// export const checkAnyStoreDirty = () => {
//   for (const store of ExamBuilderStoreFactory.getState().stores.values()) {
//     if (store.getState().isDirty()) {
//       return true;
//     }
//   }
//   return false;
// };
