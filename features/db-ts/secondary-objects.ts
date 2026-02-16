export interface RedisCacheSegmentScore {
  id: string;
  submission_id: string;
  segment_id: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  passed: boolean | null;
  total_questions: number | null;
  answered: number | null;
  correct: number | null;
  incorrect: number | null;
  skipped: number | null;
  created_at: string;
}

/** * @redis_key global_leaderboard
 * @sorting_logic (overall_pass << 30) | total_marks
 */
export type LeaderBoardEntryForRedisCache = {
  total_marks: number;
  total_answered: number;
  total_correct: number;
  total_incorrect: number;
  total_skipped: number;
  overall_pass: boolean;
  segments: Record<string, SegmentScore>;
};

export type SegmentScore = {
  total_marks: number;
  total_answered: number;
  total_skipped: number;
  total_correct: number;
  total_incorrect: number;
  segment_pass: boolean;
};

// Some cache helpers for future

// export const encodeCompositeScore = (pass: boolean, marks: number): number => {
//   const PASS_BIT = 1_000_000_000_000; // 1 Trillion
//   return (pass ? 1 : 0) * PASS_BIT + marks;
// };

// export const decodeCompositeScore = (composite: number) => {
//   const PASS_BIT = 1_000_000_000_000;
//   return {
//     passed: composite >= PASS_BIT,
//     marks: composite % PASS_BIT,
//   };
// };

// import { Redis } from "@upstash/redis"; // Using Upstash for Edge compatibility

// const redis = new Redis({ url: "...", token: "..." });

// export async function handleScoreUpdate({
//   user_id,
//   total_marks,
//   overall_pass,
// }: {
//   user_id: string;
//   total_marks: number;
//   overall_pass: boolean;
// }) {
//   const compositeScore = encodeCompositeScore(overall_pass, total_marks);

//   // ZADD: Update the global leaderboard
//   await redis.zadd("ace_leaderboard", { score: compositeScore, member: user_id });

//   return new Response("Leaderboard Updated", { status: 200 });
// }

// export async function getLeaderboard() {
//   if (topIds.length === 0) return [];

//   // 2. Hydrate from Postgres to get the "Complex" metadata
//   const { data: results, error } = await supabase
//     .from('user_results')
//     .select('user_id, total_marks, total_correct, total_incorrect, total_skipped, overall_pass, profiles(username, avatar_url)')
//     .in('user_id', topIds);

//   // 3. Sort the Postgres results to match the Redis order
//   return topIds.map(id => results?.find(r => r.user_id === id));
// }
