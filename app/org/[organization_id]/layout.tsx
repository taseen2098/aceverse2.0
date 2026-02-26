"use client";

import { useParams } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useEffect } from "react";
import {  ExamBuilderStoreFactory } from "@/lib/store/useExamBuilderStore";
import { OrgSidebar } from "./_components/org-sidebar/OrgSidebar";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const { organizationId } = useParams();
  const memberships = useAuthStore((state) => state.memberships);
  const setCurrentMembershipId = useAuthStore(
    (state) => state.setCurrentMembershipId,
  );

  useEffect(() => {
    if (organizationId && memberships.length > 0) {
      const current = memberships.find((m) => m.organization_id === organizationId);
      if (typeof current?.id === 'string') {
        setCurrentMembershipId(current.id);
      }
    }
    return () => setCurrentMembershipId(null);
  }, [organizationId, memberships, setCurrentMembershipId]);

  // Global "Unsaved Changes" Guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (ExamBuilderStoreFactory.getState().checkAnyStoreDirty()) {
        e.preventDefault();
        e.returnValue = ""; // Standard way to trigger the native browser dialog
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  console.log("Rendering Org Layout");

  return (
    <div className="flex flex-1">
      <aside className="hidden md:block">
          <OrgSidebar />
      </aside>
      <main className="flex-1 p-6 w-full">{children}</main>
    </div>
  );
}
