"use client";

import { useAuthStore } from "@/lib/store/useAuthStore";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Mail, Calendar, Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { user, memberships, loading, initialize, signOut } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const cleanup = initialize();
    return () => cleanup();
  }, [initialize]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Not authenticated</h1>
        <Button onClick={() => router.push("/login")}>Go to Login</Button>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="container mx-auto max-w-2xl py-10 px-4">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
            <User className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">{user.email}</CardTitle>
          <CardDescription>
            User ID: <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{user.id}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-medium leading-none">Account Details</h3>
            <p className="text-sm text-muted-foreground">Manage your account settings and preferences.</p>
          </div>
          
          <div className="grid gap-4 rounded-lg border p-4">
            <div className="flex items-center gap-4">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">Email</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">Joined</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-medium leading-none">Memberships</h3>
            {memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active memberships found.</p>
            ) : (
              <div className="grid gap-2 pt-2">
                {memberships.map((membership) => (
                  <div key={membership.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="grid gap-1">
                      <p className="font-medium">{membership.organization?.name || "Organization"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{membership.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.push("/settings")}>
                Settings
            </Button>
            <Button variant="destructive" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
