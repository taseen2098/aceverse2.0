'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

interface PendingAnswer {
  question_id: string;
  answer_text: string;
  answered_at: string;
}

interface UseExamSubmissionProps {
  submissionId: string;
  onSubmissionComplete?: () => void;
  onError?: (error: Error) => void;
}

export function useExamSubmission({
  submissionId,
  onSubmissionComplete,
  onError,
}: UseExamSubmissionProps) {
  // Use useRef to avoid re-renders during typing
  const pendingAnswers = useRef<Map<string, PendingAnswer>>(new Map());
  // Store all answers including synced ones to expose to UI
  const [allAnswers, setAllAnswers] = useState<Record<string, string>>({});
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const isSyncing = useRef(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<Error | null>(null);

  // TanStack mutation for syncing answers
  const syncMutation = useMutation({
    mutationFn: async (arg: PendingAnswer[]) => {
      if (isSyncing.current) {
        return { success: false, skipped: true };
      }

      isSyncing.current = true;
      
      try {
        const answersToInsert = arg.map(pa => ({
          submission_id: submissionId,
          question_id: pa.question_id,
          answer_text: pa.answer_text,
          answered_at: pa.answered_at,
        }));

        const { data, error } = await supabase
          .from('answers')
          .upsert(answersToInsert, {
            onConflict: 'submission_id,question_id',
            ignoreDuplicates: false,
          });

        if (error) throw error;

        return { success: true, count: answersToInsert.length };
      } finally {
        isSyncing.current = false;
      }
    }
  });

  // The Heartbeat - Periodic sync every 30 seconds
  useEffect(() => {
    const performHeartbeat = async () => {
      if (pendingAnswers.current.size === 0) return;
      
      try {
        const answersArray = Array.from(pendingAnswers.current.values());
        const result = await syncMutation.mutateAsync(answersArray);
        
        if (result?.success) {
          pendingAnswers.current.clear();
          setLastSyncTime(new Date());
          setSyncError(null);
        }
      } catch (error) {
        setSyncError(error as Error);
        onError?.(error as Error);
      }
    };

    heartbeatInterval.current = setInterval(performHeartbeat, 30000); // 30s heartbeat

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [submissionId, syncMutation, onError]);

  // Buffer an answer locally
  const bufferAnswer = useCallback((questionId: string, answerText: string) => {
    pendingAnswers.current.set(questionId, {
      question_id: questionId,
      answer_text: answerText,
      answered_at: new Date().toISOString(),
    });
    
    // Update local state for UI
    setAllAnswers(prev => ({
      ...prev,
      [questionId]: answerText
    }));
  }, []);

  // Manual flush function for immediate sync
  const flushAnswers = useCallback(async (): Promise<{ success: boolean; error?: Error }> => {
    if (pendingAnswers.current.size === 0) return { success: true };

    try {
      const answersArray = Array.from(pendingAnswers.current.values());
      const result = await syncMutation.mutateAsync(answersArray);
      
      if (result?.success) {
        pendingAnswers.current.clear();
        setLastSyncTime(new Date());
        setSyncError(null);
        return { success: true };
      }
      return { success: false, error: new Error('Flush failed') };
    } catch (error) {
      setSyncError(error as Error);
      return { success: false, error: error as Error };
    }
  }, [syncMutation]);

  // The "Flush on Submit" Function
  const submitExam = useCallback(async (timeSpent: number): Promise<{ success: boolean; error?: Error }> => {
    setIsSubmitting(true);
    setSyncError(null);

    try {
      await flushAnswers();
      await new Promise(resolve => setTimeout(resolve, 500));

      const { error: updateError } = await supabase
        .from('submissions')
        .update({ status: 'submitted' })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      const { error: gradeError } = await supabase.functions.invoke('grade-exam', {
        body: { submissionId },
      });

      if (gradeError) console.error('Grading failed:', gradeError);

      onSubmissionComplete?.();
      return { success: true };
    } catch (error) {
      setSyncError(error as Error);
      onError?.(error as Error);
      return { success: false, error: error as Error };
    } finally {
      setIsSubmitting(false);
    }
  }, [submissionId, flushAnswers, onSubmissionComplete, onError]);

  const retrySubmission = useCallback(async (timeSpent: number) => {
    return submitExam(timeSpent);
  }, [submitExam]);

  const getBufferStatus = useCallback(() => {
    return {
      pendingCount: pendingAnswers.current.size,
      isSyncing: syncMutation.isPending,
      isSubmitting,
      lastSyncTime,
      syncError,
      buffer: allAnswers,
    };
  }, [syncMutation.isPending, isSubmitting, lastSyncTime, syncError, allAnswers]);

  return {
    bufferAnswer,
    flushAnswers,
    submitExam,
    retrySubmission,
    getBufferStatus,
    isSubmitting,
    isSyncing: syncMutation.isPending,
    syncError,
    lastSyncTime,
    buffer: allAnswers
  };
}
