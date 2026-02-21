"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { StaffRole, StaffRoles } from "@/features/db-ts/objects";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Logged in successfully");
      router.refresh();

      const orgRoles = data.user?.app_metadata?.org_roles || {};
      const isStaff = Object.values(orgRoles).some((role) => 
        StaffRoles.includes(role as StaffRole)
      );

      if (isStaff) {
        router.push("/teacher-dashboard");
        return;
      }
      router.push("/student-dashboard");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-aceverse-ice px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-aceverse-blue/20 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center text-aceverse-navy">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to continue your progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-aceverse-navy font-semibold">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="border-aceverse-blue/20 focus:border-aceverse-blue"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                title="Enter your password"
                className="text-aceverse-navy font-semibold"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                className="border-aceverse-blue/20 focus:border-aceverse-blue"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-aceverse-navy hover:bg-aceverse-navy/90 text-white font-bold h-11"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-center text-sm">
          <div className="text-aceverse-navy/60">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-bold text-aceverse-blue hover:underline"
            >
              Create one now
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
