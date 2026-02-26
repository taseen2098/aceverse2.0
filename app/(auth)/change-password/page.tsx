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
import { useRouter } from "next/navigation";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      router.push("/login");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update password",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-aceverse-ice px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-aceverse-blue/20 shadow-xl">
        <CardHeader className="space-y-1">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-aceverse-navy/5">
            <Lock className="h-8 w-8 text-aceverse-blue" />
          </div>
          <CardTitle className="text-3xl font-bold text-center text-aceverse-navy">
            Set new password
          </CardTitle>
          <CardDescription className="text-center">
            Please enter your new password below.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4 my-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-aceverse-navy font-semibold">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="border-aceverse-blue/20 focus:border-aceverse-blue text-md h-11 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-3 py-2 text-aceverse-navy/60 hover:text-aceverse-navy flex items-center justify-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="text-aceverse-navy font-semibold"
              >
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="border-aceverse-blue/20 focus:border-aceverse-blue text-md h-11 pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0 top-0 h-full px-3 py-2 text-aceverse-navy/60 hover:text-aceverse-navy flex items-center justify-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showConfirmPassword ? "Hide password" : "Show password"}
                  </span>
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-aceverse-blue hover:bg-aceverse-blue/90 text-white font-bold h-11 text-md"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
