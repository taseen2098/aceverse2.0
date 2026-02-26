import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { StudentGroup } from '@/lib/types';
import { toast } from 'sonner';

export function useStudentGroups(organizationId: string) {
  const queryClient = useQueryClient();

  const queryKey = ['student_groups', organizationId];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_groups')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StudentGroup[];
    },
    enabled: !!organizationId,
  });

  const createGroup = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('student_groups')
        .insert({ name, organization_id: organizationId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Batch created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create batch');
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('student_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Batch deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete batch');
    },
  });

  return {
    groups: data || [],
    isLoading,
    error,
    createGroup,
    deleteGroup,
  };
}
