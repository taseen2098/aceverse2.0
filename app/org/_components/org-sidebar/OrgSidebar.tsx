"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/useAuthStore";
import {
  ExamBuilderStoreFactory,
} from "@/lib/store/useExamBuilderStore";
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  Users,
  BarChart,
  PlusCircle,
  List,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Tags,
  Edit,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useStore } from "zustand";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useShallow } from "zustand/react/shallow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useExamSave } from "@/lib/hooks/useExamSave";

export function OrgSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const loading = useAuthStore((state) => state.loading);

  const organizationId = useAuthStore(
    (state) =>
      state.memberships.find((m) => m.id === state.currentMembershipId)
        ?.organization_id,
  );

  const role = useAuthStore(
    (state) =>
      state.memberships.find((m) => m.id === state.currentMembershipId)
        ?.member_role || null,
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

  const isTeacher = ["primary_owner", "manager", "teacher"].includes(role || "");

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
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-aceverse-navy dark:text-aceverse-ice">
            Organization Menu
          </h2>
          <div className="space-y-1">
            <NavLink
              href={`/org/${organizationId}`}
              icon={LayoutDashboard}
              active={pathname === `/org/${organizationId}`}
            >
              Dashboard
            </NavLink>

            {isTeacher ? (
              <>
                <CollapsibleNav
                  title="Exams"
                  icon={BookOpen}
                  active={
                    pathname.startsWith(`/org/${organizationId}/exams`) ||
                    examIds.length > 0
                  }
                >
                  <NavLink
                    href={`/org/${organizationId}/exams`}
                    icon={List}
                    active={pathname === `/org/${organizationId}/exams`}
                    subItem
                  >
                    View Exams
                  </NavLink>
                  <NavLink
                    href={`/org/${organizationId}/exams/create`}
                    icon={PlusCircle}
                    active={isCreatingExam}
                    subItem
                  >
                    Create Exam
                  </NavLink>
                  {examIds.map((examId) => (
                    <EditExamNavLinks
                      key={examId}
                      examId={examId}
                      organizationId={organizationId}
                      pathname={pathname}
                      handleCloseTab={handleCloseTab}
                    />
                  ))}
                </CollapsibleNav>

                <CollapsibleNav
                  title="Questions"
                  icon={FileQuestion}
                  active={pathname.startsWith(`/org/${organizationId}/questions`)}
                >
                  <NavLink
                    href={`/org/${organizationId}/questions`}
                    icon={List}
                    active={pathname === `/org/${organizationId}/questions`}
                    subItem
                  >
                    View Questions
                  </NavLink>
                  <NavLink
                    href={`/org/${organizationId}/questions/create`}
                    icon={PlusCircle}
                    active={isCreatingQuestion}
                    subItem
                  >
                    Create Question
                  </NavLink>
                </CollapsibleNav>

                <NavLink
                  href={`/org/${organizationId}/subjects`}
                  icon={Tags}
                  active={pathname === `/org/${organizationId}/subjects`}
                >
                  Subjects
                </NavLink>

                <NavLink
                  href={`/org/${organizationId}/students`}
                  icon={GraduationCap}
                  active={pathname === `/org/${organizationId}/students`}
                >
                  Students
                </NavLink>

                <NavLink
                  href={`/org/${organizationId}/manage-batch`}
                  icon={Users}
                  active={pathname.startsWith(`/org/${organizationId}/manage-batch`)}
                >
                  Manage Batch
                </NavLink>

                <NavLink
                  href={`/org/${organizationId}/results`}
                  icon={BarChart}
                  active={pathname.startsWith(`/org/${organizationId}/results`)}
                >
                  Exam Results
                </NavLink>
              </>
            ) : (
              // Student Links
              <>
                <NavLink
                  href={`/org/${organizationId}/exams`}
                  icon={BookOpen}
                  active={pathname.startsWith(`/org/${organizationId}/exams`)}
                >
                  My Exams
                </NavLink>
                <NavLink
                  href={`/org/${organizationId}/results`}
                  icon={BarChart}
                  active={pathname.startsWith(`/org/${organizationId}/results`)}
                >
                  My Results
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>

      <TabCloseDialog 
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

function TabCloseDialog({ 
  examId, 
  onClose, 
  onConfirm 
}: { 
  examId: string | null; 
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!examId) return null;
  return <TabCloseDialogInner examId={examId} onClose={onClose} onConfirm={onConfirm} />;
}

function TabCloseDialogInner({ 
  examId, 
  onClose, 
  onConfirm 
}: { 
  examId: string; 
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { handleSave, confirmExit, loading } = useExamSave(examId);

  const handleSaveAndExit = async () => {
    const success = await handleSave(true);
    if (success) {
      ExamBuilderStoreFactory.getState().deleteExamBuilderStore(examId);
      onConfirm();
    }
  };

  const handleDiscardAndExit = () => {
    confirmExit(); 
    // We manually delete here just in case confirmExit doesn't do it immediately or we want to be sure
    ExamBuilderStoreFactory.getState().deleteExamBuilderStore(examId);
    onConfirm();
  };

  return (
    <AlertDialog open={true} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            This exam has unsaved changes. Would you like to save them before closing the tab?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onClose} className="sm:mt-0">Cancel</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={handleDiscardAndExit}
            className="text-red-600 border-red-200 hover:bg-red-50"
            disabled={loading}
          >
            Discard & Close
          </Button>
          <Button
            onClick={handleSaveAndExit}
            className="bg-aceverse-navy hover:bg-aceverse-navy/90 text-white"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Exit
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EditExamNavLinks({
  examId,
  organizationId,
  pathname,
  handleCloseTab,
}: {
  examId: string;
  organizationId: string | undefined;
  pathname: string;
  handleCloseTab: (e: React.MouseEvent, id: string) => void;
}) {
  // We need to subscribe to the store to get the title
  const store = ExamBuilderStoreFactory.getState().createExamBuilderStoreFactory(examId);
  const title = useStore(store, (state) => state.exam.title || "Untitled Exam");
  
  return (
    <NavLink
      key={examId}
      href={`/org/${organizationId}/edit-exam/${examId}`}
      icon={Edit}
      active={pathname.includes(examId)}
      subItem
    >
      <div className="flex justify-between items-center w-full">
        <span className="truncate">{title}</span>
        <div
          role="button"
          aria-label="Close tab"
          onClick={(e) => handleCloseTab(e, examId)}
          className="ml-2 p-1 rounded-full hover:bg-red-100 hover:text-red-500"
        >
          <X className="h-3 w-3" />
        </div>
      </div>
    </NavLink>
  );
}

function NavLink({
  href,
  icon: Icon,
  children,
  active,
  subItem = false,
  onClick,
}: {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
  active?: boolean;
  subItem?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start items-center",
          active && "bg-aceverse-ice text-aceverse-navy font-semibold",
          subItem && "pl-8 text-sm",
        )}
      >
        <Icon
          className={cn(
            "mr-2 h-4 w-4 shrink-0",
            active ? "text-aceverse-blue" : "text-muted-foreground",
          )}
        />
        {children}
      </Button>
    </Link>
  );
}

function CollapsibleNav({
  title,
  icon: Icon,
  children,
  active,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  active?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(active);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-between",
            active && "bg-aceverse-ice/50 text-aceverse-navy",
          )}
        >
          <div className="flex items-center">
            <Icon
              className={cn(
                "mr-2 h-4 w-4",
                active ? "text-aceverse-blue" : "text-muted-foreground",
              )}
            />
            {title}
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 mt-1">{children}</CollapsibleContent>
    </Collapsible>
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
