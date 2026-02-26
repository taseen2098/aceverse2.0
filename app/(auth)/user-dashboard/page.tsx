"use client";

import { useAuthStore } from "@/lib/store/useAuthStore";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  GraduationCap,
  Trophy,
  Activity,
  Calendar,
  ChevronRight,
  BookMarked,
} from "lucide-react";
import Link from "next/link";

export default function UserDashboardPage() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex-1 space-y-6 md:p-8 p-4 pt-6 bg-aceverse-ice min-h-screen">
        <Skeleton className="h-24 w-full rounded-xl bg-aceverse-blue/10" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-xl bg-aceverse-blue/10" />
          <Skeleton className="h-32 rounded-xl bg-aceverse-blue/10" />
          <Skeleton className="h-32 rounded-xl bg-aceverse-blue/10" />
          <Skeleton className="h-32 rounded-xl bg-aceverse-blue/10" />
        </div>
        <Skeleton className="h-100 w-full rounded-xl bg-aceverse-blue/10" />
      </div>
    );
  }

  const fullName = user?.user_metadata?.full_name || user?.app_metadata?.full_name;
  const firstName = fullName?.split(" ")[0] || "Unknown User";
  const avatarUrl = user?.app_metadata?.avatar_url;

  return (
    <div className="flex-1 space-y-6 md:p-8 p-4 pt-6 bg-aceverse-ice min-h-screen">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between space-y-2 bg-white p-6 rounded-2xl shadow-sm border border-aceverse-blue/10">
        <div className="flex items-center space-x-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={fullName || "Profile"}
              width={64}
              height={64}
              className="rounded-full ring-2 ring-aceverse-blue/20 bg-aceverse-ice object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-aceverse-blue/10 flex items-center justify-center text-aceverse-navy font-bold text-xl">
              {firstName.charAt(0)}
            </div>
          )}
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-aceverse-navy">
              Welcome back, {firstName}! 🚀
            </h2>
            <p className="text-muted-foreground mt-1">
              Ready to ace your next exam? Here&apos;s an overview of your progress.
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center space-x-2">
          <Button
            className="bg-aceverse-blue hover:bg-aceverse-blue/90 font-semibold"
            asChild
          >
            <Link href="/user-dashboard/my-memberships">
              View Memberships <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-aceverse-navy/80">
              Active Batches
            </CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="h-4 w-4 text-aceverse-blue" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-aceverse-navy">3</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Currently enrolled
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-aceverse-navy/80">
              Exams Completed
            </CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <GraduationCap className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-aceverse-navy">12</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              +2 from last week
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-aceverse-navy/80">
              Average Score
            </CardTitle>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Trophy className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-aceverse-navy">86%</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Top 15% in your batch
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-aceverse-navy/80">
              Activity Streak
            </CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-aceverse-navy">5 days</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Keep it up!
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Exams or Batches */}
        <Card className="col-span-4 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-aceverse-navy flex items-center">
              <BookMarked className="mr-2 h-5 w-5 text-aceverse-blue" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Your latest submitted exams and assignments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  title: "Physics Mastery Exam",
                  score: "85/100",
                  date: "Today, 10:30 AM",
                  status: "passed",
                },
                {
                  title: "Algebra Essentials Quiz",
                  score: "20/20",
                  date: "Yesterday, 2:15 PM",
                  status: "passed",
                },
                {
                  title: "Organic Chemistry Pop Quiz",
                  score: "12/20",
                  date: "Oct 12, 4:00 PM",
                  status: "passed",
                },
                {
                  title: "Biology Midterm",
                  score: "Pending",
                  date: "Oct 10, 11:00 AM",
                  status: "pending",
                },
              ].map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-xl border border-aceverse-blue/10 hover:bg-aceverse-ice/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-aceverse-ice p-3 rounded-full">
                      <GraduationCap className="h-5 w-5 text-aceverse-navy" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-aceverse-navy leading-none">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${activity.status === "pending" ? "text-amber-600" : "text-green-600"}`}
                    >
                      {activity.score}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Section */}
        <Card className="col-span-3 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-aceverse-navy flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-aceverse-blue" />
              Upcoming
            </CardTitle>
            <CardDescription>
              Don&apos;t miss these scheduled events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  title: "Math Titans Weekly Test",
                  time: "Tomorrow, 3:00 PM",
                  type: "Exam",
                },
                {
                  title: "Mechanics Live Class",
                  time: "Friday, 5:00 PM",
                  type: "Class",
                },
                {
                  title: "Biology Assignment Due",
                  time: "Sunday, 11:59 PM",
                  type: "Deadline",
                },
              ].map((upcoming, i) => (
                <div
                  key={i}
                  className="flex items-center pb-4 border-b border-aceverse-blue/10 last:border-0 last:pb-0"
                >
                  <div className="ml-2 space-y-1">
                    <p className="text-sm font-semibold text-aceverse-navy leading-none">
                      {upcoming.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {upcoming.time} • {upcoming.type}
                    </p>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                className="w-full mt-4 border-aceverse-blue/20 text-aceverse-navy hover:bg-aceverse-blue/10 font-semibold"
              >
                View All Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
