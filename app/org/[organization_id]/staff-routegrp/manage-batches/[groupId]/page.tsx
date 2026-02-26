'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGroupMembers } from '@/lib/hooks/useGroupMembers';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AddStudentDialog } from '@/components/org/AddStudentDialog';

export default function BatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.organizationId as string;
  const groupId = params.groupId as string;

  const { members, availableStudents, loading, addMember, removeMember } = useGroupMembers(groupId, organizationId);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-aceverse-navy">Batch Members</h1>
          <p className="text-muted-foreground text-sm">Manage students in this group.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Students ({members.length})</CardTitle>
          <AddStudentDialog 
            organizationId={organizationId}
            availableStudents={availableStudents}
            onStudentSelected={async (userId) => {
              addMember.mutate(userId);
            }}
            title="Add Student to Batch"
            description="Select a student from the organization or add by email."
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{member.profile.full_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    {member.profile.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>{member.profile.email}</TableCell>
                  <TableCell>{new Date(member.joined_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeMember.mutate(member.user_id)}
                      disabled={removeMember.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No students in this batch yet.
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
