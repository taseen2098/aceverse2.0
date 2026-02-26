'use server';

import { createClient } from '@supabase/supabase-js';

// Helper to get Supabase Admin Client (Service Role)
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Generic function to ensure a user is a member of the organization with a specific role.
 */
export async function ensureMemberInOrg(organizationId: string, email: string, role: string = 'student') {
  try {
    const admin = getAdminClient();

    // 1. Find User by Email
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, email, role')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      console.error('User not found error:', profileError);
      return { error: 'User with this email does not exist in the system.' };
    }

    const userId = profile.id;

    const { data: membership } = await admin
      .from('memberships')
      .select('id, member_role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (membership) {
      if (membership.member_role !== role) {
        // Update existing membership role
        const { error: updateError } = await admin
          .from('memberships')
          .update({ member_role: role })
          .eq('id', membership.id);
        
        if (updateError) {
          console.error('Error updating member role:', updateError);
          return { error: `Failed to update member role to ${role}.` };
        }
      }
      return { userId };
    }

    // 3. Add to Organization
    const { error: insertError } = await admin
      .from('memberships')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        member_role: role
      });

    if (insertError) {
      console.error('Error adding member:', insertError);
      return { error: `Failed to add ${role} to organization.` };
    }

    return { userId };

  } catch (err: unknown) {
    console.error('Unexpected error in ensureMemberInOrg:', err);
    return { error: (err as Error).message || 'An unexpected error occurred.' };
  }
}

/**
 * Ensures a student is a member of the organization.
 */
export async function ensureStudentInOrg(organizationId: string, email: string) {
  return ensureMemberInOrg(organizationId, email, 'student');
}

/**
 * Removes a member from the organization.
 */
export async function removeMemberFromOrg(organizationId: string, userId: string) {
    try {
        const admin = getAdminClient();
        const { error } = await admin
            .from('memberships')
            .delete()
            .eq('organization_id', organizationId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error removing member:', error);
            return { error: 'Failed to remove member.' };
        }

        return { success: true };
    } catch (err: unknown) {
        return { error: (err as Error).message };
    }
}

/**
 * Removes a student from the organization.
 * Note: This deletes the membership record.
 */
export async function removeStudentFromOrg(organizationId: string, userId: string) {
    return removeMemberFromOrg(organizationId, userId);
}
