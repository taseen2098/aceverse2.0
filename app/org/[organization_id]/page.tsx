"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { useExams } from "@/lib/hooks/useExams";
import { Loader2, Plus, Search, Trash2, Tag, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectTrigger,
//   SelectValue,
//   SelectContent,
//   SelectItem,
// } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
import SingleQuestionEditor from "./questions/create/_SingleQuestionEditor";
import { useQuestionEditorStore } from "@/lib/store/useQuestionEditorStore";
import { Edit } from "lucide-react";
// import { IncompleteQuestion } from "@/lib/types";
import { useInView } from "react-intersection-observer";
// import { useDebounce } from "@/lib/hooks/useDebounce";

export default function QuestionsPage() {
  const params = useParams();
  const organizationId = params.organizationId as string;

  const [searchTerm, setSearchTerm] = useState("");
  // const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);

  // const {
  //   data,
  //   isLoading: questionsLoading,
  //   refetch,
  //   fetchNextPage,
  //   hasNextPage,
  //   isFetchingNextPage,
  // } = useInfiniteQuestions(
  //   organizationId,
  //   debouncedSearchTerm,
  //   selectedSubject || undefined,
  //   undefined,
  //   selectedExam || undefined
  // );

  // const { ref, inView } = useInView();

  // useEffect(() => {
  //   if (inView && hasNextPage) {
  //     fetchNextPage();
  //   }
  // }, [inView, fetchNextPage, hasNextPage]);

  // const { data: subjects, isLoading: subjectsLoading } = useSubjects(organizationId);
  // const { data: exams, isLoading: examsLoading } = useExams(organizationId);

  // // Edit State
  // const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // const setQuestionToEdit = useQuestionEditorStore((state) => state.setQuestion);

  // const allQuestions = useMemo(() => {
  //   return data?.pages.flat() || [];
  // }, [data]);

  // const handleDeleteQuestion = async (id: string) => {
  //   if (!confirm("Are you sure you want to delete this question?")) return;

  //   try {
  //     const { error } = await supabase.from("questions").delete().eq("id", id);
  //     if (error) throw error;
  //     toast.success("Question deleted");
  //     refetch();
  //   } catch (e) {
  //     toast.error("Failed to delete question");
  //     console.error(e);
  //   }
  // };

  // const handleEditClick = (question: IncompleteQuestion) => {
  //   setQuestionToEdit(question);
  //   setIsEditModalOpen(true);
  // };

  // const isLoading = questionsLoading || subjectsLoading || examsLoading;

  return null;
}
