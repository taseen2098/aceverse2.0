"use client";

import { useParams } from "next/navigation";
import { useOrgStudents } from "@/lib/hooks/useOrgStudents";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AddStudentDialog } from "./AddStudentDialog";
import RemoveStudentDialog from "./RemoveStudentDIalog";

export default function OrgStudentsPage() {
  const params = useParams();
  const organizationId = params.organizationId as string;
  const { students, loading, removeStudent, refreshStudents } = useOrgStudents();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-aceverse-navy">Students</h1>
          <p className="text-muted-foreground text-sm">
            Manage all students in your organization.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Total Students ({students.length})</CardTitle>
          <AddStudentDialog
            organizationId={organizationId}
            availableStudents={[]} // We don't need a select list here, forcing "Email Only" mode mostly, or we could pass something if we wanted.
            // Actually, for "Add to Org", there is no "Available Students" list because we are viewing *all* students.
            // So the dialog will default to "Add by Email".
            onStudentSelected={async () => {
              refreshStudents();
            }}
            title="Add Student to Organization"
            description="Enter the email of the student you want to add to this organization."
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
              {students.map((student) => (
                <TableRow key={student.user_id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {student.profile.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    {student.profile.full_name || "N/A"}
                  </TableCell>
                  <TableCell>{student.profile.email}</TableCell>
                  <TableCell>
                    {new Date(student.joined_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <RemoveStudentDialog
                      student={student}
                      removeStudent={removeStudent}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {students.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No students found.
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
