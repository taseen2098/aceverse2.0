import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useOrgRealtimeStore } from "./useOrgRealtimeStore";

import { OrgRealtimeManager } from "@/lib/logic/OrgRealtimeManager";
import { ExamWhileBuilding,ExamSegmentWhileBuilding, QuestionWhileBuilding, DBQuestion } from "@/features/db-ts/objects";

// Types needed for Realtime/Dirty State
export interface RealtimePayload {
  exam?: Partial<ExamWhileBuilding>;
  segments?: Partial<ExamSegmentWhileBuilding>[];
  questions?: QuestionWhileBuilding[];
  assignedGroupIds?: string[];
  deletedQuestionIds?: string[];
  deletedSegmentIds?: string[];
  questionIds?: string[]; // Added for ordering sync
  segmentIds?: string[];  // Added for ordering sync
  senderId?: string;
}

export interface DirtyState {
  exam: Partial<ExamWhileBuilding>;
  segments: Record<string, Partial<ExamSegmentWhileBuilding>>;
  questions: Record<string, Partial<QuestionWhileBuilding>>;
  assignedGroupIds: string[] | null;
  questionIds: string[] | null; // Added for ordering sync
  segmentIds: string[] | null;  // Added for ordering sync
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
    savedQuestions:DBQuestion[],
    savedGroups: string[] | null
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
      const originalQ: Record<string, QuestionWhileBuilding> = {};
      const originalS: Record<string, ExamSegmentWhileBuilding> = {};
      const qById: Record<string, QuestionWhileBuilding> = {};
      const qIds: string[] = [];

      // Sort questions by order_index (lexicographical)
      const sortedQuestions = [...questions].sort((a, b) => 
        (a.order_index || "").localeCompare(b.order_index || "")
      );

      sortedQuestions.forEach((q) => {
        if (q.id) {
          originalQ[q.id] = JSON.parse(JSON.stringify(q));
          qById[q.id] = q;
          qIds.push(q.id);
        }
      });

      // Sort segments by order_index (numerical)
      const sortedSegments = [...segments].sort((a, b) => 
        a.order_index.localeCompare(b.order_index)
      );

      sortedSegments.forEach((s) => {
        if (s.id) originalS[s.id] = JSON.parse(JSON.stringify(s));
      });

      // Ensure realtime is connected for this organization
      let manager = null;
      if (exam.organization_id) {
          const rtStore = useOrgRealtimeStore.getState();
          rtStore.connect(exam.organization_id);
          manager = rtStore.manager;
      }

      // MERGE LOGIC: If we received remote changes while we were uninitialized, apply them now!
      const currentRemote = get().remoteDirtyData;
      let mergedExam = { ...exam };
      const mergedQById = { ...qById };
      let mergedQIds = [...qIds];
      const mergedSegments = [...sortedSegments];

      if (currentRemote) {
          console.log(`Store Init: Applying background remote changes to initial state for ${exam.id}`, currentRemote);
          if (currentRemote.exam) mergedExam = { ...mergedExam, ...currentRemote.exam };
          if (currentRemote.questions) {
              currentRemote.questions.forEach(q => {
                  if (q.id) {
                      if (!mergedQById[q.id]) mergedQIds.push(q.id);
                      mergedQById[q.id] = { ...mergedQById[q.id], ...q };
                  }
              });
          }
          if (currentRemote.questionIds) mergedQIds = currentRemote.questionIds;
          // Deletions
          if (currentRemote.deletedQuestionIds) {
              currentRemote.deletedQuestionIds.forEach(id => {
                  delete mergedQById[id];
                  mergedQIds = mergedQIds.filter(qid => qid !== id);
              });
          }
      }

      set({
        exam: mergedExam,
        segments: mergedSegments,
        questionsById: mergedQById,
        questionIds: mergedQIds,
        assignedGroupIds,
        isInitialized: true,
        manager,
        originalExam: JSON.parse(JSON.stringify(exam)),
        originalSegments: originalS,
        originalQuestions: originalQ,
        originalAssignedGroupIds: [...assignedGroupIds],
        deletedQuestionIds: [],
        deletedSegmentIds: [],
        dirtyState: {
            exam: {},
            segments: {},
            questions: {},
            assignedGroupIds: null,
            questionIds: null,
            segmentIds: null
        },
        _isDirty: false,
        isRemoteDirty: !!currentRemote,
      });
    },

    setExam: (exam) =>
      set((state) => ({
        exam: { ...state.exam, ...exam },
        dirtyState: { ...state.dirtyState, exam: { ...state.dirtyState.exam, ...exam } },
        _isDirty: true,
      })),

    setSegments: (segments) =>
      set((state) => {
        const newDirtySegments = { ...state.dirtyState.segments };
        segments.forEach(s => {
            if(s.id) newDirtySegments[s.id] = { ...newDirtySegments[s.id], ...s };
        });
        const newIds = segments.map(s => s.id!);
        return {
            segments,
            dirtyState: { 
                ...state.dirtyState, 
                segments: newDirtySegments,
                segmentIds: newIds 
            },
            _isDirty: true
        };
      }),

    addQuestion: (question, index) =>
      set((state) => {
        const newById = { ...state.questionsById, [question.id!]: question };
        const newIds = [...state.questionIds];
        if (typeof index === "number" && index >= 0) {
          newIds.splice(index, 0, question.id!);
        } else {
          newIds.push(question.id!);
        }
        
        const newDirtyQuestions = { ...state.dirtyState.questions, [question.id!]: question };

        return {
          questionsById: newById,
          questionIds: newIds,
          dirtyState: { 
              ...state.dirtyState, 
              questions: newDirtyQuestions,
              questionIds: newIds 
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
            [id]: { ...state.dirtyState.questions[id], ...delta } 
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
        const newById = { ...state.questionsById };
        delete newById[id];
        
        const newIds = state.questionIds.filter((qid) => qid !== id);
        const newDirtyQuestions = { ...state.dirtyState.questions };
        delete newDirtyQuestions[id];

        return {
          questionsById: newById,
          questionIds: newIds,
          deletedQuestionIds: !id.includes("-temp-")
            ? [...state.deletedQuestionIds, id]
            : state.deletedQuestionIds,
          dirtyState: { 
              ...state.dirtyState, 
              questions: newDirtyQuestions,
              questionIds: newIds 
          },
          _isDirty: true,
        };
      }),

    reorderQuestions: (newIds) => set((state) => {
        return { 
            questionIds: newIds, 
            dirtyState: { ...state.dirtyState, questionIds: newIds },
            _isDirty: true 
        };
    }),

    setQuestions: (questions) => {
      const qById: Record<string, QuestionWhileBuilding> = {};
      const qIds: string[] = [];
      questions.forEach((q) => {
        if (q.id) {
          qById[q.id] = q;
          qIds.push(q.id);
        }
      });
      set((state) => ({ 
          questionsById: qById, 
          questionIds: qIds, 
          _isDirty: true,
          dirtyState: { ...state.dirtyState, questionIds: qIds }
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
         
         const newSegments = state.segments.filter((s) => s.id !== id);
         const newIds = newSegments.map(s => s.id!);

         return {
            segments: newSegments,
            deletedSegmentIds: !id.includes("-temp-")
              ? [...state.deletedSegmentIds, id]
              : state.deletedSegmentIds,
            dirtyState: { 
                ...state.dirtyState, 
                segments: newDirtySegments,
                segmentIds: newIds 
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
            segmentIds: null 
        },
        _isDirty: false,
        remoteDirtyData: null,
        isRemoteDirty: false,
      }),

    getQuestionsArray: () => {
      const s = get();
      return s.questionIds.map((id) => s.questionsById[id]).filter(Boolean);
    },
    
    isDirty: () => get()._isDirty,
    markClean: () => set({ _isDirty: false }),

    // --- Realtime / Collaboration Actions ---

    setRemoteData: (payload) => set((state) => {
        console.log(`Store: Applying remote data for exam ${payload.exam?.id}`, payload);
        const newQuestionsById = { ...state.questionsById };
        let newQuestionIds = payload.questionIds || [...state.questionIds];
        const newSegments = [...state.segments];
        
        // Handle Questions
        if (payload.questions) {
            payload.questions.forEach(q => {
                if (q.id) {
                    if (!newQuestionsById[q.id] && !newQuestionIds.includes(q.id)) {
                        newQuestionIds.push(q.id);
                    }
                    newQuestionsById[q.id] = { ...newQuestionsById[q.id], ...q };
                }
            });
        }
        
        // Handle Deletions
        if (payload.deletedQuestionIds) {
            payload.deletedQuestionIds.forEach(id => {
               delete newQuestionsById[id]; 
               newQuestionIds = newQuestionIds.filter(qid => qid !== id);
            });
        }

        // Handle Segments
        if (payload.segments) {
            payload.segments.forEach(s => {
                const idx = newSegments.findIndex(seg => seg.id === s.id);
                if (idx !== -1) {
                    newSegments[idx] = { ...newSegments[idx], ...s } as ExamSegmentWhileBuilding;
                } else if (s.id) {
                    newSegments.push(s as ExamSegmentWhileBuilding);
                }
            });
        }
        
        if (payload.segmentIds) {
            newSegments.sort((a, b) => payload.segmentIds!.indexOf(a.id!) - payload.segmentIds!.indexOf(b.id!));
        }
        
        // Handle Exam Meta
        const newExam = { ...state.exam, ...(payload.exam || {}) };

        return {
            questionsById: newQuestionsById,
            questionIds: newQuestionIds,
            segments: newSegments,
            exam: newExam,
            remoteDirtyData: payload,
            isRemoteDirty: false 
        };
    }),

    markRemoteAsDirty: (payload) => set((state) => {
        console.log(`Store: Promoting remote data to DIRTY for saving`, payload);
        const newDirtyExam = { ...state.dirtyState.exam, ...(payload.exam || {}) };
        const newDirtyQuestions = { ...state.dirtyState.questions };
        const newDirtySegments = { ...state.dirtyState.segments };
        
        payload.questions?.forEach(q => {
            if (q.id) newDirtyQuestions[q.id] = { ...newDirtyQuestions[q.id], ...q };
        });
        
        payload.segments?.forEach(s => {
            if (s.id) newDirtySegments[s.id] = { ...newDirtySegments[s.id], ...s };
        });

        const newDeletedQ = [...new Set([...state.deletedQuestionIds, ...(payload.deletedQuestionIds || [])])];
        const newDeletedS = [...new Set([...state.deletedSegmentIds, ...(payload.deletedSegmentIds || [])])];

        return {
            dirtyState: {
                ...state.dirtyState,
                exam: newDirtyExam,
                questions: newDirtyQuestions,
                segments: newDirtySegments,
                assignedGroupIds: payload.assignedGroupIds || state.dirtyState.assignedGroupIds,
                questionIds: payload.questionIds || state.dirtyState.questionIds,
                segmentIds: payload.segmentIds || state.dirtyState.segmentIds
            },
            deletedQuestionIds: newDeletedQ,
            deletedSegmentIds: newDeletedS,
            _isDirty: true,
            isRemoteDirty: true
        };
    }),

    acknowledgeSavedItems: (savedExam, savedSegments, savedQuestions, savedGroups) => set((state) => {
        const newDirtyExam = { ...state.dirtyState.exam };
        const newDirtyQuestions = { ...state.dirtyState.questions };
        savedQuestions.forEach(q => {
            if (q.id) delete newDirtyQuestions[q.id];
        });
        const newDirtySegments = { ...state.dirtyState.segments };
        savedSegments.forEach(s => {
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
                assignedGroupIds: savedGroups ? null : state.dirtyState.assignedGroupIds,
                questionIds: isStillDirty ? state.dirtyState.questionIds : null,
                segmentIds: isStillDirty ? state.dirtyState.segmentIds : null
            },
            deletedQuestionIds: [], 
            deletedSegmentIds: [],  
            _isDirty: isStillDirty,
            isRemoteDirty: false,
            remoteDirtyData: null
        };
    })
  }))
);

export const examBuilderStores = new Map<
  string,
  ReturnType<typeof createExamBuilderStore>
>();

const createExamBuilderStoreFactory = (stores: typeof examBuilderStores) => {
  return (examId: string) => {
    if (!stores.has(examId)) {
      stores.set(examId, createExamBuilderStore());
    }
    return stores.get(examId)!;
  };
};

if (typeof window !== 'undefined' && process.env.NODE_ENV === "development") {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.examFactory = examBuilderStores;
}

export const getOrCreateExamBuilderStore =
  createExamBuilderStoreFactory(examBuilderStores);

export const deleteExamBuilderStore = (examId: string) => {
  if (examBuilderStores.has(examId)) {
    examBuilderStores.delete(examId);
    console.log(`Deleted store for examId: ${examId}`);
    
    // If no more exam builder stores exist, disconnect realtime
    if (examBuilderStores.size === 0) {
        useOrgRealtimeStore.getState().disconnect();
    }
  }
};

export const renameExamBuilderStore = (oldId: string, newId: string) => {
  if (examBuilderStores.has(oldId) && oldId !== newId) {
    const store = examBuilderStores.get(oldId)!;
    examBuilderStores.set(newId, store);
    examBuilderStores.delete(oldId);
    console.log(`Migrated store from ${oldId} to ${newId}`);
  }
};

export const getAllExamBuilderStores = () => {
  return Array.from(examBuilderStores.values());
};

export const checkAnyStoreDirty = () => {
  for (const store of examBuilderStores.values()) {
    if (store.getState().isDirty()) {
      return true;
    }
  }
  return false;
};
