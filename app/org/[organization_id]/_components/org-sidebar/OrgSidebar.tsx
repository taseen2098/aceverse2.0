"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { ExamBuilderStoreFactory } from "@/lib/store/useExamBuilderStore";
import { LayoutDashboard } from "lucide-react";
import { useState, useMemo } from "react";
import { useStore } from "zustand";

import DialogForClosingEditableExam from "../DialogForClosingEditableExam";
import { Skeleton } from "@/components/ui/skeleton";
import NavLink from "./_components/NavLink";
import StaffLinks from "./_components/StaffLinks";
import StudentLinks from "./_components/StudentLinks";

export function OrgSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const loading = useAuthStore((state) => state.loading);

  const organizationId = useAuthStore(
    (state) => state.getCurrentMembership()?.organization_id || null,
  );

  const role = useAuthStore(
    (state) => state.getCurrentMembership()?.member_role || null,
  );

  const stores = useStore(ExamBuilderStoreFactory, (state) => state.stores);
  const examIds = useMemo(() => Array.from(stores.keys()), [stores]);

  const [tabToClose, setTabToClose] = useState<string | null>(null);

  if (loading) {
    return <SidebarSkeleton />;
  }

  if (!role && !loading) {
    return (
      <div className="w-64 border-r bg-card h-[calc(100vh-4rem)] sticky top-16 p-4">
        <p className="text-sm text-muted-foreground bg-aceverse-ice p-3 rounded-md border border-aceverse-blue/20">
          No membership found for this organization.
        </p>
      </div>
    );
  }

  const isStaff = ["primary_owner", "manager", "teacher"].includes(role || "");

  const isCreatingExam = pathname.endsWith("/exams/create");
  const isCreatingQuestion = pathname.endsWith("/questions/create");

  const handleCloseTab = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if dirty
    const store = stores.get(id);
    if (store && store.getState().isDirty()) {
      setTabToClose(id);
    } else {
      ExamBuilderStoreFactory.getState().deleteExamBuilderStore(id);
      if (pathname.includes(id)) {
        router.push(`/org/${organizationId}`);
      }
    }
  };

  return (
    <div className="w-64 border-r bg-card h-[calc(100vh-4rem)] overflow-y-auto sticky top-16">
      <div className="p-4 space-y-4">
        <div className="px-3 py-2">
          <div className="space-y-1">
            <NavLink
              href={`/org/${organizationId}`}
              icon={LayoutDashboard}
              active={pathname === `/org/${organizationId}`}
            >
              Dashboard
            </NavLink>

            {isStaff ? (
              <StaffLinks
                pathname={pathname}
                organizationId={organizationId}
                examIds={examIds}
                isCreatingExam={isCreatingExam}
                handleCloseTab={handleCloseTab}
                isCreatingQuestion={isCreatingQuestion}
              />
            ) : (
              // Student Links
              <StudentLinks organizationId={organizationId} pathname={pathname} />
            )}
          </div>
        </div>
      </div>

      <DialogForClosingEditableExam
        examId={tabToClose}
        onClose={() => setTabToClose(null)}
        onConfirm={() => {
          if (tabToClose) {
            ExamBuilderStoreFactory.getState().deleteExamBuilderStore(tabToClose);
            if (pathname.includes(tabToClose)) {
              router.push(`/org/${organizationId}`);
            }
          }
          setTabToClose(null);
        }}
      />
    </div>
  );
}



function SidebarSkeleton() {
  return (
    <div className="w-64 border-r p-4 space-y-4">
      <Skeleton className="h-8 w-3/4" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
