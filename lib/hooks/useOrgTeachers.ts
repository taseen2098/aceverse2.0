
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { removeMemberFromOrg } from '@/actions/org-management';

export interface OrgTeacher {
  user_id: string;
  joined_at: string;
  member_role: string;
  profile: {
    email: string;
    full_name: string | null;
  };
}

export function useOrgTeachers(organizationId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['org_teachers', organizationId];

  // 1. Fetch Teachers (members with teacher, manager, or primary_owner roles)
  const { data: teachers, isLoading } = useQuery({
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
        .in('member_role', ['teacher', 'manager', 'primary_owner']);

      if (error) throw error;
      
      return data.map((item) => ({
        user_id: item.user_id,
        joined_at: item.created_at,
        member_role: item.member_role,
        profile: (Array.isArray(item.profile) ? item.profile[0] : item.profile) 
      })) as OrgTeacher[];
    },
    enabled: !!organizationId,
  });

  // 2. Remove Teacher
  const removeTeacher = useMutation({
    mutationFn: async (userId: string) => {
        const result = await removeMemberFromOrg(organizationId, userId);
        if (result.error) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Teacher removed from organization');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refreshTeachers = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    teachers: teachers || [],
    loading: isLoading,
    removeTeacher,
    refreshTeachers
  };
}
