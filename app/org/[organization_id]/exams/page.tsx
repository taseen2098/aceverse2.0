"use client";

import { useExams } from "@/lib/hooks/useExams";

import { useAuthStore } from "@/lib/store/useAuthStore";

import { Loader2, Plus, Calendar } from "lucide-react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import ExamCard from "./_components/ExamCard";

export default function OrgExamsPage() {
  const { organizationId } = useParams();
  const userLoading = useAuthStore((state) => state.loading);
  const {
    data: exams,
    isLoading: examsLoading,
    
  } = useExams();
  const isStaff = useAuthStore((state) => {
    const membership = state.memberships?.find(
      (m) => m.organization_id === organizationId,
    );
    const role = membership?.member_role;
    return  ["primary_owner", "manager", "teacher"].includes(role || "");
  });
  

  if (userLoading || examsLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="animate-spin text-aceverse-blue" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-aceverse-navy">Exams</h1>

          <p className="text-muted-foreground mt-1">
            Manage and monitor exams for this organization.
          </p>
        </div>

        {isStaff && (
          <Link href={`/org/${organizationId}/create-exam`}>
            <Button className="bg-aceverse-blue hover:bg-aceverse-blue/90 shadow-md">
              <Plus className="mr-2 h-4 w-4" /> Create New Exam
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {exams?.map((exam) => (
          <ExamCard
            key={exam.id}
            exam={exam}
          />
        ))}
      </div>

      {exams?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-aceverse-blue/20">
          <div className="h-16 w-16 bg-aceverse-ice rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-aceverse-blue/40" />
          </div>

          <h3 className="text-lg font-semibold text-aceverse-navy">No Exams Yet</h3>

          <p className="text-muted-foreground max-w-xs text-center mt-1">
            Create your first exam to start assessing your students.
          </p>

          {isStaff && (
            <Link href={`/org/${organizationId}/create-exam`} className="mt-6">
              <Button className="bg-aceverse-blue hover:bg-aceverse-blue/90">
                <Plus className="mr-2 h-4 w-4" /> Create First Exam
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
