"use server";

import { redis } from "@/lib/redis/client";
import { adminClient } from "@/lib/supabase/admin";
import { StartOrResumeReturnObject } from "./student";
import { createClient } from "../supabase/server";

const EXAM_TTL = 86400; // 24 hours in seconds

async function _getCachedExamContent(examId: string) {
  const cacheKey = `exam_bundle:${examId}`;

  // 1. Try Cache
  const cached = await redis.get(cacheKey);
  if (cached) return { data: cached, error: null };

  // 2. Cache Miss - Fetch from Supabase RPC
  const { data, error } = await adminClient.rpc("get_exam_content_bundle", {
    p_exam_id: examId,
  });

  if (error || !data) return { data: null, error };

  // 3. Populate Cache
  // We use 'ex' to ensure stale data eventually dies
  await redis.set(cacheKey, data, { ex: EXAM_TTL });

  return { data, error };
}

// THE SNIPER INVALIDATOR
export async function invalidateExamCache(examId: string) {
  await redis.del(`exam_bundle:${examId}`);
}

export const startOrResumeExam = async (
  examId: string,
): Promise<StartOrResumeReturnObject> => {
  "use server";
  const supabaseServerClient = await createClient();
  const { data: dynamicData, error: dynamicError } = await supabaseServerClient.rpc(
    "start_or_resume_logic_only",
    { p_exam_id: examId },
  );
  if (dynamicError) {
    throw new Error(dynamicError.message || "Failed to start exam");
  }

  const { data: cachedData, error: cacheLoadingError } =
    await _getCachedExamContent(examId);
  if (cacheLoadingError) {
    throw new Error(cacheLoadingError.message || "Failed to fetch exam content");
  }

  return { ...dynamicData, ...cachedData };
};
