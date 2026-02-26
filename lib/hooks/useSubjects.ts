'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Subject } from '@/lib/types';
import { toast } from 'sonner';

export function useSubjects(organizationId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['subjects', organizationId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      return data as Subject[];
    },
    enabled: !!organizationId,
  });

  const createSubject = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('subjects')
        .insert({ name, organization_id: organizationId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Subject created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSubject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Subject deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    ...query,
    createSubject,
    deleteSubject
  };
}
