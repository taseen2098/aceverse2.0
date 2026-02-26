import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { getExamsForStudents } from "@/server/BasicStudentApi";
import { useAuthStore } from "../store/useAuthStore";
import { PostgrestError } from "@supabase/supabase-js";

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

export const examsKeys = {
  all: ["exams"] as const,
  byMembership: (membershipId: string) => [...examsKeys.all, membershipId] as const,
};

export const useExams = () => {
  const membership = useAuthStore(state => state.getCurrentMembership());
  
  return useQuery({
    queryKey: examsKeys.byMembership(membership?.id || ""),

    queryFn: async () => {
      const membershipRole = membership?.member_role;
      const organizationId = membership?.organization_id;

      if (!organizationId || !membershipRole) return [];

      let data = null;
      let error: PostgrestError | null = null;

      if (membershipRole !== "student") {
        ({ data, error } = await supabase
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
          .order("created_at", { ascending: false }));
      } else {
        ({ data, error } = await getExamsForStudents(organizationId));
      }

      if (error) throw new Error(error.message);
      return data as Exam[];
    }
  });
};

/**
 * Fetch a single exam by ID
 */
export const useExam = (examId: string | undefined) => {
  return useQuery({
    queryKey: ["exam", examId],
    queryFn: async () => {
      if (!examId) return null;

      const { data, error } = await supabase
        .from("exams")
        .select(
          `
          id,
          organization_id,
          title,
          description,
          duration,
          start_time,
          end_time,
          created_at,
          is_published,
          allow_type,
          pass_threshold_type,
          pass_threshold_value,
          has_negative_marking,
          negative_marks_value,
          allowed_attempts,
          allow_instant_result
        `,
        )
        .eq("id", examId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    enabled: !!examId,
  });
};

/**
 * Fetch exam segments for a specific exam
 */
export const useExamSegments = (examId: string | undefined) => {
  return useQuery({
    queryKey: ["exam-segments", examId],
    queryFn: async () => {
      if (!examId) return [];

      const { data, error } = await supabase
        .from("exam_segments")
        .select(
          `
          id,
          name,
          order_index,
          requires_individual_pass,
          pass_threshold_type,
          pass_threshold_value
        `,
        )
        .eq("exam_id", examId)
        .order("order_index", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    enabled: !!examId,
  });
};
