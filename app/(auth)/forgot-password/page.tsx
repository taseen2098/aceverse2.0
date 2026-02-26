"use client";

import { useState } from "react";
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
import Link from "next/link";
import { KeyRound, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/change-password`,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Password reset link sent to your email.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send reset link.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-aceverse-ice px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border-aceverse-blue/20 shadow-xl">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-aceverse-navy/5">
              <KeyRound className="h-8 w-8 text-aceverse-blue" />
            </div>
            <CardTitle className="text-3xl font-bold text-center text-aceverse-navy">
              Check your email
            </CardTitle>
            <CardDescription className="text-center">
              We&apos;ve sent a password reset link to{" "}
              <strong className="text-aceverse-navy">{email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full border-aceverse-blue/20 text-aceverse-navy hover:bg-aceverse-blue/10"
              asChild
            >
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-aceverse-ice px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-aceverse-blue/20 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center text-aceverse-navy">
            Forgot password?
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we&apos;ll send you a link to reset your
            password.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4 my-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-aceverse-navy font-semibold">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="border-aceverse-blue/20 focus:border-aceverse-blue text-md h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              className="w-full bg-aceverse-blue hover:bg-aceverse-blue/90 text-white font-bold h-11 text-md"
              type="submit"
              disabled={loading}
            >
              {loading ? "Sending link..." : "Send reset link"}
            </Button>
            <Button
              variant="link"
              className="px-0 font-normal text-aceverse-navy hover:text-aceverse-blue"
              asChild
            >
              <Link href="/login" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
