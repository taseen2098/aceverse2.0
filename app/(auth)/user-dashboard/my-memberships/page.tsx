"use client";

import { useAuthStore } from "@/lib/store/useAuthStore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";
import Link from "next/link";

export default function MyMembershipsPage() {
  const { memberships, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="p-8 space-y-4 pt-6 min-h-screen bg-aceverse-ice">
        <Skeleton className="h-12 w-1/3 mb-6 bg-aceverse-blue/10" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32 w-full bg-aceverse-blue/10" />
          <Skeleton className="h-32 w-full bg-aceverse-blue/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 pt-6 min-h-screen bg-aceverse-ice">
      <h2 className="text-3xl font-bold text-aceverse-navy mb-6">My Memberships</h2>

      {memberships.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <Building2 className="h-12 w-12 text-aceverse-blue/40 mb-4" />
            <p className="text-lg font-medium text-aceverse-navy">
              No Enrolled Memberships
            </p>
            <p className="text-sm">You are not enrolled in any organizations yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {memberships.map((m) => (
            <Link href={`/org/${m.organization_id}`} key={m.id}>
              <Card className="border-aceverse-blue/20 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-aceverse-navy">
                      {m.organization?.name || "Unknown Organization"}
                    </CardTitle>
                    <CardDescription className="capitalize mt-1 font-medium">
                      Role: {m.member_role || "Student"}
                    </CardDescription>
                  </div>
                  <div className="h-10 w-10 bg-aceverse-blue/10 rounded-full flex items-center justify-center text-aceverse-blue">
                    <Building2 className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Status:{" "}
                    <span className="font-semibold text-green-600 capitalize">
                      {m.status}
                    </span>
                  </p>
                  {m.on_free_trial && (
                    <p className="text-xs font-semibold text-amber-600 mt-1">
                      On Free Trial
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
