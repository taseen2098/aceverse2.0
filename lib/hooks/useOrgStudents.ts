
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { removeStudentFromOrg } from '@/server/OrgApi';
import { useAuthStore } from '../store/useAuthStore';

export interface OrgStudent {
  user_id: string;
  joined_at: string;
  role: string;
  profile: {
    email: string;
    full_name: string | null;
  };
}

export function useOrgStudents() {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore(state => state.getCurrentMembership()?.organization_id || "");
  const queryKey = ['students', organizationId];

  // 1. Fetch Students
  const { data: students, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          user_id,
          created_at,
          member_role,
          profile:profiles!inner(email, full_name)
        `)
        .eq('organization_id', organizationId)
        .eq('member_role', 'student'); // Only students? Or allow teachers too?
        // Requirement says "view all students". So 'student' role.

      if (error) throw error;
      
      return data.map((item) => ({
        user_id: item.user_id,
        joined_at: item.created_at,
        role: item.member_role,
        profile: (Array.isArray(item.profile) ? item.profile[0] : item.profile) 
      })) as OrgStudent[];
    },
    enabled: !!organizationId,
  });

  // 2. Remove Student
  const removeStudent = useMutation({
    mutationFn: async (userId: string) => {
        // Use Server Action for reliable removal (and potentially stronger auth checks in future)
        const result = await removeStudentFromOrg(organizationId, userId);
        if (result.error) throw new Error(result.error);
    },
    onSuccess: (_, userId) => {
      queryClient.setQueryData(queryKey, (oldData: OrgStudent[]) => {
        return oldData.filter((item) => item.user_id !== userId);
      });
      toast.success('Student removed from organization');
    },
    onError: (e) => toast.error(e.message),
  });

  // 3. Add Student (No-op here, as the Dialog handles the Server Action directly, 
  //    but we need a way to refresh the list)
  const refreshStudents = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    students: students || [],
    loading: isLoading,
    removeStudent,
    refreshStudents
  };
}
