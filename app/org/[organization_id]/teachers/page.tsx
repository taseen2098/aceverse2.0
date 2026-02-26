'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useOrgTeachers } from '@/lib/hooks/useOrgTeachers';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Trash2, ShieldCheck, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AddStudentDialog } from '@/components/org/AddStudentDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { redirect } from 'next/navigation';

export default function OrgTeachersPage() {
  const params = useParams();
  const organizationId = params.organizationId as string;
  const { teachers, loading, removeTeacher, refreshTeachers } = useOrgTeachers(organizationId);
  const profile = useAuthStore((state) => state.profile);
  const memberships = useAuthStore((state) => state.memberships);

  const currentMembership = memberships.find(m => m.organization_id === organizationId);
  const isOwnerOrAdmin = currentMembership?.member_role === 'primary_owner' || profile?.role === 'admin';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!isOwnerOrAdmin) {
    redirect(`/org/${organizationId}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-aceverse-navy">Staff Members</h1>
          <p className="text-muted-foreground text-sm">Manage teachers and managers in your organization.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Total Staff ({teachers.length})</CardTitle>
          <AddStudentDialog 
            organizationId={organizationId} 
            onStudentSelected={async () => {
              refreshTeachers();
            }}
            role="teacher"
            title="Add Teacher to Organization"
            description="Enter the email of the user you want to add as a Teacher."
            triggerButton={
                <Button className="bg-aceverse-navy hover:bg-aceverse-navy/90">
                    Add Teacher
                </Button>
            }
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.user_id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{teacher.profile.full_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    {teacher.profile.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>{teacher.profile.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        {teacher.member_role === 'primary_owner' ? (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none flex gap-1 items-center">
                                <ShieldCheck className="h-3 w-3" /> Owner
                            </Badge>
                        ) : teacher.member_role === 'manager' ? (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none flex gap-1 items-center">
                                <Shield className="h-3 w-3" /> Manager
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none">
                                Teacher
                            </Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(teacher.joined_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {teacher.member_role !== 'primary_owner' && (
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive"
                            >
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to remove <b>{teacher.profile.full_name || teacher.profile.email}</b> from the organization? 
                                This staff member will lose all access to organization exams.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={() => removeTeacher.mutate(teacher.user_id)}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                Remove
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {teachers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No staff found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
