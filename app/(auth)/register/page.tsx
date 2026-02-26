"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      toast.error("You must agree to our terms of service and privacy policies.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(
        "Registration successful! Please verify your email and sign in.",
      );
      router.push("/login");
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
            Create an account
          </CardTitle>
          <CardDescription className="text-center">
            Join AceVerse to start your journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-aceverse-navy font-semibold">
                Full Name
              </Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                className="border-aceverse-blue/20 focus:border-aceverse-blue"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
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
                title="At least 6 characters"
                className="text-aceverse-navy font-semibold"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="border-aceverse-blue/20 focus:border-aceverse-blue pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-3 py-2 text-aceverse-navy/60 hover:text-aceverse-navy"
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
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                className="mt-1 border-aceverse-blue/40 data-[state=checked]:bg-aceverse-blue data-[state=checked]:border-aceverse-blue"
              />
              <Label
                htmlFor="terms"
                className="text-sm text-aceverse-navy/80 leading-normal"
              >
                I agree to the{" "}
                <Link
                  href="/terms-of-service"
                  className="font-bold text-aceverse-blue hover:underline"
                >
                  terms of service
                </Link>{" "}
                and{" "}
                <Link
                  href="/terms-of-service"
                  className="font-bold text-aceverse-blue hover:underline"
                >
                  privacy policies
                </Link>
                .
              </Label>
            </div>
            <Button
              type="submit"
              className="w-full bg-aceverse-blue hover:bg-aceverse-blue/90 text-white font-bold h-11"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-center text-sm">
          <div className="text-aceverse-navy/60">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-aceverse-blue hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
