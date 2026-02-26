"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type { Question } from "@/lib/types";

export function useInfiniteQuestions(
  organizationId: string,
  searchTerm: string = "",
  subjectId?: string,
  questionType?: string,
  examId?: string,
) {
  return useInfiniteQuery({
    queryKey: [
      "questions-infinite",
      organizationId,
      searchTerm,
      subjectId,
      questionType,
      examId,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      const pageSize = 50; // Flexible, as per requirement
      let query = supabase
        .from("questions")
        .select(
          `
          *, 
          subject:subjects(name), 
          exam:exams(title)
        `,
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .range(pageParam * pageSize, (pageParam + 1) * pageSize - 1);

      if (searchTerm) {
        query = query.ilike("question_text", `%${searchTerm}%`);
      }
      if (subjectId) {
        query = query.eq("subject_id", subjectId);
      }
      if (questionType) {
        query = query.eq("question_type", questionType);
      }
      if (examId) {
        query = query.eq("exam_id", examId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as (Question & {
        subject: { name: string } | null;
        exam: { title: string } | null;
      })[];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 50 ? allPages.length : undefined;
    },
    initialPageParam: 0,
    enabled: !!organizationId,
  });
}

export function useQuestionDetails(questionId: string) {
  return useQuery({
    queryKey: ["question-details", questionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*, subject:subjects(name), exam:exams(title)")
        .eq("id", questionId)
        .single();

      if (error) throw error;
      return data as Question & {
        subject: { name: string } | null;
        exam: { title: string } | null;
      };
    },
    enabled: !!questionId,
  });
}
