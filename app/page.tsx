"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  GraduationCap,
  ChartBar,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Users,
  Trophy,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { Role, StaffRole, StaffRoles } from "@/features/db-ts/objects";

const sanitizedRoles: Record<Role, string> = {
  owner: "Owner",
  manager: "Manager",
  teacher: "Teacher",
  student: "Student",
  admin: "Admin",
};

const getHighestRole = (roles: Role[]): Role => {
  if (roles.includes("owner")) return "owner";
  if (roles.includes("manager")) return "manager";
  if (roles.includes("teacher")) return "teacher";
  return "student";
};

export default function Home() {
  const user = useAuthStore((state) => state.user);
  const memberships = useAuthStore((state) => state.memberships);
  const isStaff = useAuthStore((state) =>
    state.memberships.some((membership) => {
      console.log(membership.member_role);
      return StaffRoles.includes(membership.member_role as StaffRole);
    }),
  );

  return (
    <div className="flex flex-col bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-28 lg:py-32 bg-gradient-to-br from-aceverse-ice via-white to-blue-50">
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="flex flex-col items-start gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <Badge
                variant="outline"
                className="bg-primary/10 border-primary/20 text-primary px-4 py-1.5 text-sm font-semibold shadow-sm hover:bg-primary/10"
              >
                <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
                Now Accepting New Students
              </Badge>
              <h1 className="text-5xl font-extrabold tracking-tight text-aceverse-navy sm:text-6xl md:text-7xl leading-[1.1]">
                Master the <span className="text-primary">IBA</span> <br />
                Entrance Exam
              </h1>
              <p className="max-w-150 text-lg md:text-xl text-muted-foreground leading-relaxed">
                Experience the most realistic simulation of the IBA admission test.
                Get real-time grading, advanced analytics, and personalized feedback
                to guarantee your success.
              </p>

              <div className="flex flex-col gap-4 w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  {user ? (
                    !isStaff ? (
                      <Link href="/student-dashboard" className="w-full sm:w-auto">
                        <Button
                          size="lg"
                          className="w-full sm:w-auto text-lg h-12 px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
                        >
                          Continue as student
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                    ) : null
                  ) : (
                    <Link href="/register" className="w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto text-lg h-12 px-8 border-2 border-primary/20 hover:bg-primary/5 hover:border-primary text-aceverse-navy"
                      >
                        Create Account
                      </Button>
                    </Link>
                  )}
                </div>

                {user && isStaff ? (
                  <Link href="/dashboard" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto text-lg h-12 px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
                    >
                      Continue as{" "}
                      {
                        sanitizedRoles[
                          getHighestRole(memberships.map((m) => m.member_role as Role))
                        ]
                      }
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/login" className="w-full">
                    <Button
                      size="lg"
                      className="w-full text-lg h-12 px-8 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
                    >
                      Login
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden"
                    >
                      <div
                        className={`h-full w-full bg-gradient-to-br from-slate-300 to-slate-400`}
                      />
                    </div>
                  ))}
                </div>
                <p>
                  Joined by{" "}
                  <span className="font-bold text-aceverse-navy">1,000+</span>{" "}
                  students this month
                </p>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[500px] lg:max-w-none animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-8 border-white bg-white">
                <Image
                  src="/Banner.png"
                  alt="AceVerse Platform Interface"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-aceverse-navy/30 to-transparent pointer-events-none"></div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-slate-100 flex items-center gap-3 animate-bounce duration-3000">
                <div className="bg-green-100 p-2 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-aceverse-navy">Verified Results</p>
                  <p className="text-xs text-muted-foreground">Updated 1 min ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Abstract Shapes */}
        <div className="absolute top-0 right-0 -z-10 h-full w-1/2 bg-gradient-to-l from-blue-50 to-transparent opacity-60"></div>
        <div className="absolute bottom-0 left-0 -z-10 h-1/2 w-1/2 bg-gradient-to-tr from-aceverse-ice to-transparent opacity-60 rounded-tr-[100px]"></div>
      </section>

      {/* Stats Section */}
      <section className="bg-aceverse-navy py-12 border-y border-white/10">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <h3 className="text-4xl font-bold text-white">50k+</h3>
              <p className="text-blue-200 text-sm uppercase tracking-wider font-medium">
                Questions Attempted
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-bold text-white">1.2k+</h3>
              <p className="text-blue-200 text-sm uppercase tracking-wider font-medium">
                Active Students
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-bold text-white">98%</h3>
              <p className="text-blue-200 text-sm uppercase tracking-wider font-medium">
                Satisfaction Rate
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-bold text-white">24/7</h3>
              <p className="text-blue-200 text-sm uppercase tracking-wider font-medium">
                System Uptime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 md:py-32 bg-white">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-primary font-semibold tracking-wide uppercase text-sm mb-3">
              Why AceVerse?
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-aceverse-navy mb-6">
              Designed to Replicate the Real Exam Environment
            </h3>
            <p className="text-muted-foreground text-lg">
              We&apos;ve analyzed years of IBA admission patterns to build a platform
              that doesn&apos;t just test your knowledge, but prepares you for the
              pressure.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:bg-aceverse-ice/50 transition-all duration-300 hover:-translate-y-1">
              <div className="h-14 w-14 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
              <h4 className="text-xl font-bold text-aceverse-navy mb-3">
                Complete Syllabus Coverage
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Access thousands of questions covering English, Mathematics, and
                Analytical Reasoning, curated by top IBA graduates.
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:bg-aceverse-ice/50 transition-all duration-300 hover:-translate-y-1">
              <div className="h-14 w-14 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ChartBar className="h-7 w-7 text-primary" />
              </div>
              <h4 className="text-xl font-bold text-aceverse-navy mb-3">
                Deep Performance Analytics
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Visualize your strengths and weaknesses with our advanced dashboard.
                Track your percentile ranking against the competition.
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:bg-aceverse-ice/50 transition-all duration-300 hover:-translate-y-1">
              <div className="h-14 w-14 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <GraduationCap className="h-7 w-7 text-primary" />
              </div>
              <h4 className="text-xl font-bold text-aceverse-navy mb-3">
                Smart Grading System
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Our grading engine supports negative marking and sectional cut-offs,
                exactly like the actual IBA admission test.
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:bg-aceverse-ice/50 transition-all duration-300 hover:-translate-y-1">
              <div className="h-14 w-14 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <h4 className="text-xl font-bold text-aceverse-navy mb-3">
                Secure & Reliable
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Take exams with confidence. Our heartbeat mechanism ensures your
                progress is saved even if you lose internet connectivity.
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:bg-aceverse-ice/50 transition-all duration-300 hover:-translate-y-1">
              <div className="h-14 w-14 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <h4 className="text-xl font-bold text-aceverse-navy mb-3">
                Community Leaderboards
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Compete with peers and see where you stand. Healthy competition
                drives better preparation and results.
              </p>
            </div>

            <div className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/20 hover:bg-aceverse-ice/50 transition-all duration-300 hover:-translate-y-1">
              <div className="h-14 w-14 rounded-xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Trophy className="h-7 w-7 text-primary" />
              </div>
              <h4 className="text-xl font-bold text-aceverse-navy mb-3">
                Gamified Learning
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                Earn badges and track your streak. We make the grueling preparation
                process engaging and rewarding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 container mx-auto px-4 md:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-aceverse-navy shadow-2xl">
          <div className="absolute inset-0 bg-[url('/Poster.png')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
          <div className="relative z-10 grid lg:grid-cols-2 gap-12 p-12 md:p-16 items-center">
            <div className="text-white space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                Ready to Secure Your Admission?
              </h2>
              <p className="text-blue-100 text-lg opacity-90 max-w-md">
                Don&apos;t leave your future to chance. Join the platform that has
                helped hundreds of students ace their entrance exams.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-white text-aceverse-navy hover:bg-blue-50 text-base h-12 px-8 font-semibold"
                  >
                    Get Started for Free
                  </Button>
                </Link>
                <Link href="/exams">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/30 text-white hover:bg-white/10 bg-aceverse-navy text-base h-12 px-8"
                  >
                    View Sample Exams
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden lg:block relative">
              {/* Decorative card mockup */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[380px] bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 transform rotate-6"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[380px] bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 transform -rotate-6"></div>
              <div className="relative z-10 bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-auto transform rotate-0 hover:scale-105 transition-transform">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-aceverse-navy">Weekly Champion</p>
                    <p className="text-xs text-muted-foreground">
                      Top Score: 98/100
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 bg-slate-100 rounded-full w-full overflow-hidden">
                    <div className="h-full bg-primary w-[98%]"></div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full w-3/4 overflow-hidden">
                    <div className="h-full bg-primary/60 w-[85%]"></div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full w-5/6 overflow-hidden">
                    <div className="h-full bg-primary/40 w-[92%]"></div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t text-center">
                  <p className="text-sm font-medium text-primary">
                    Join the leaderboard
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
