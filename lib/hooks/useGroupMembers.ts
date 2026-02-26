import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export interface GroupMember {
  id: string; // group_member id
  user_id: string;
  joined_at: string;
  profile: {
    email: string;
    full_name: string | null;
  };
}

export interface AvailableStudent {
  user_id: string;
  email: string;
  full_name: string | null;
}

export function useGroupMembers(groupId: string, organizationId: string) {
  const queryClient = useQueryClient();
  const membersKey = ['group_members', groupId];
  const availableKey = ['available_students', organizationId, groupId];

  // 1. Fetch current members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: membersKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          id,
          user_id,
          created_at,
          profile:profiles!inner(email, full_name)
        `)
        .eq('group_id', groupId);

      if (error) throw error;
      
      return data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        joined_at: item.created_at,
        profile: (Array.isArray(item.profile) ? item.profile[0] : item.profile) as any
      })) as GroupMember[];
    },
    enabled: !!groupId,
  });

  // 2. Fetch available students (in org, not in group)
  const { data: availableStudents, isLoading: availableLoading } = useQuery({
    queryKey: availableKey,
    queryFn: async () => {
      // Get all students in the org
      const { data: orgStudents, error: orgError } = await supabase
        .from('memberships')
        .select(`
          user_id,
          profile:profiles!inner(email, full_name)
        `)
        .eq('organization_id', organizationId)
        .in('member_role', ['student', 'teacher', 'manager', 'primary_owner']); // Allow adding anyone

      if (orgError) throw orgError;

      // Get IDs already in group
      const { data: existingIds, error: groupError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (groupError) throw groupError;

      const existingSet = new Set(existingIds?.map((m: any) => m.user_id));

      // Filter
      return orgStudents
        .filter((m: any) => !existingSet.has(m.user_id))
        .map((m: any) => ({
          user_id: m.user_id,
          email: (m.profile as any).email,
          full_name: (m.profile as any).full_name
        })) as AvailableStudent[];
    },
    enabled: !!groupId && !!organizationId,
  });

  // 3. Add Member
  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKey });
      queryClient.invalidateQueries({ queryKey: availableKey });
      toast.success('Student added to batch');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // 4. Remove Member
  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersKey });
      queryClient.invalidateQueries({ queryKey: availableKey });
      toast.success('Student removed from batch');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    members: members || [],
    availableStudents: availableStudents || [],
    loading: membersLoading || availableLoading,
    addMember,
    removeMember
  };
}
