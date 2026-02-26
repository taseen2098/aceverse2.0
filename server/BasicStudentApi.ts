"use server";
import { adminClient } from "@/lib/supabase/admin";
import { redis } from "@/lib/redis/client";
import { ServerActionReturnType } from ".";
import { Membership } from "@/features/db-ts/objects";

export interface Exam {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  questions_count: number;
  duration: number;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  is_published: boolean;
  allow_type: "public" | "group_based" | "everyone_in_org";
}

/**
 * Fetch a list of exams for a specific organization
 */
export const getExamsForStudents = async (
  organizationId: string | undefined,
): ServerActionReturnType<Exam[] | null> => {
  if (!organizationId) return { data: null, error: "No organization ID provided" };

  const { data, error } = await adminClient
    .from("exams")
    .select(
      `
      id,
      organization_id,
      title,
      description,
      questions_count,
      duration,
      start_time,
      end_time,
      created_at,
      is_published,
      allow_type
    `,
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error || !data) return { data: null, error };
  return { data, error };
};
