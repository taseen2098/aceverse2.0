'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Submission, Answer } from '@/lib/types';

export function useMySubmissions() {
  return useQuery({
    queryKey: ['my-submissions'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          exam_id,
          status,
          started_at,
          submitted_at,
          total_score,
          max_score,
          percentage,
          passed
        `)
        .eq('student_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Submission[];
    },
  });
}

export function useSubmission(submissionId: string) {
  return useQuery({
    queryKey: ['submission', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          answers(*),
          segment_scores(*)
        `)
        .eq('id', submissionId)
        .single();

      if (error) throw error;
      return data as Submission;
    },
    enabled: !!submissionId,
  });
}

export function useCreateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (examId: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('submissions')
        .insert([{
          exam_id: examId,
          student_id: user.user.id,
        }])
        .select('id')
        .single();

      if (error) throw error;
      return data as Submission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
    },
  });
}

export function useSubmitAnswer() {
  return useMutation({
    mutationFn: async (answer: Partial<Answer>) => {
      const { data, error } = await supabase
        .from('answers')
        .insert([answer])
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useCompleteSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ submissionId, timeSpent }: { submissionId: string; timeSpent: number }) => {
      const { data, error } = await supabase
        .from('submissions')
        .update({
          submitted_at: new Date().toISOString(),
          time_spent: timeSpent,
        })
        .eq('id', submissionId)
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
    },
  });
}
