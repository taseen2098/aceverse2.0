"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import {
  Loader2,
  TrendingUp,
  ArrowRight,
  BarChart,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LoadingDisplay from "@/components/shared/LoadingDisplay";
import { format } from "date-fns";
import { Exam, Submission } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";

export default function OrgResultsPage() {
  const { organizationId } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const role = useAuthStore(
    (state) =>
      state.memberships.find((m) => m.organization_id === organizationId)
        ?.member_role,
  );

  const isTeacher = ["primary_owner", "manager", "teacher"].includes(role || "");

  // State for Student View
  const [studentResults, setStudentResults] = useState<Submission[]>([]);

  // State for Teacher View
  const [teacherExams, setTeacherExams] = useState<Exam[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!role) return;

      try {
        if (isTeacher) {
          // Fetch exams for this org to show leaderboards
          const { data, error } = await supabase
            .from("exams")
            .select("*")
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false });

          if (error) throw error;
          setTeacherExams(data || []);
        } else {
          // Fetch student results for this org
          const res = await fetch(
            `/api/student/results?organizationId=${organizationId}`,
          );
          if (!res.ok) throw new Error("Failed to fetch results");
          const data = await res.json();
          setStudentResults(data.submissions || []);
        }
      } catch (error) {
        console.error("Error loading results:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organizationId, role, isTeacher]);

  if (loading) return <LoadingDisplay fullScreen message="Loading results..." />;

  // --- Teacher View ---
  if (isTeacher) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-aceverse-navy">
            Exam Leaderboards
          </h1>
          <p className="text-muted-foreground">
            Select an exam to view detailed student performance and rankings.
          </p>
        </div>

        {teacherExams.length === 0 ? (
          <div className="text-center py-12 border rounded-lg border-dashed bg-gray-50">
            <p className="text-muted-foreground">
              No exams found for this organization.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teacherExams.map((exam) => (
              <Card
                key={exam.id}
                className="hover:shadow-lg transition-shadow cursor-pointer border-aceverse-ice"
                onClick={() => router.push(`/leaderboard/${exam.id}`)}
              >
                <CardHeader>
                  <CardTitle className="line-clamp-1 text-aceverse-navy">
                    {exam.title}
                  </CardTitle>
                  <CardDescription>
                    Created: {new Date(exam.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm text-aceverse-blue font-medium">
                      <TrendingUp size={16} />
                      <span>View Rankings</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-aceverse-navy"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Student View ---
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-aceverse-navy">My Results</h1>
        <p className="text-muted-foreground">
          Track your performance in this organization.
        </p>
      </div>

      {studentResults.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <BarChart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              You haven&apos;t completed any exams in this organization yet.
            </p>
            <Button onClick={() => router.push(`/org/${organizationId}/exams`)}>
              View Available Exams
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {studentResults.map((submission) => (
            <Card
              key={submission.id}
              className="hover:shadow-lg transition-shadow border-aceverse-ice"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-aceverse-navy line-clamp-1">
                      {(submission as Submission & { exam?: { title: string } }).exam
                        ?.title || "Untitled Exam"}
                    </CardTitle>
                    <CardDescription>
                      {format(
                        new Date(submission.created_at),
                        "MMM d, yyyy • h:mm a",
                      )}
                    </CardDescription>
                  </div>
                  {submission.passed !== null && (
                    <Badge
                      variant={submission.passed ? "default" : "destructive"}
                      className={
                        submission.passed ? "bg-green-600 hover:bg-green-700" : ""
                      }
                    >
                      {submission.passed ? "PASSED" : "FAILED"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase font-semibold">
                      Score
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-aceverse-navy">
                        {submission.total_score ?? "-"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / {submission.max_score ?? "-"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(`/results/leaderboard/${submission.exam_id}`)
                      } // Use global route for leaderboard
                      className="text-aceverse-blue border-aceverse-blue hover:bg-aceverse-ice w-full justify-between"
                    >
                      <TrendingUp size={14} className="mr-2" />
                      Leaderboard
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/results/${submission.id}`)} // Use global route for details
                      className="bg-aceverse-navy hover:bg-aceverse-blue w-full justify-between"
                    >
                      Details <ArrowRight size={14} className="ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
