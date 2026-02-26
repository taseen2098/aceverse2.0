'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UserPlus, Mail, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ensureStudentInOrg } from '@/server/OrgApi';

export interface StudentOption {
  user_id: string;
  email: string;
  full_name: string | null;
}

interface AddStudentDialogProps {
  organizationId: string;
  availableStudents?: StudentOption[]; // If provided, shows "Select" tab
  onStudentSelected: (userId: string) => Promise<void> | void; // Callback when a student is picked/added
  triggerButton?: React.ReactNode;
  title?: string;
  description?: string;
}

export function AddStudentDialog({
  organizationId,
  availableStudents = [],
  onStudentSelected,
  triggerButton,
  title = "Add Student",
  description = "Add a student to this list."
}: AddStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(availableStudents.length > 0 ? 'select' : 'email');
  
  // Select State
  const [selectedId, setSelectedId] = useState<string>('');
  
  // Email State
  const [email, setEmail] = useState('');

  const handleSelectSubmit = async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      await onStudentSelected(selectedId);
      setOpen(false);
      setSelectedId('');
    } catch (error) {
      toast.error((error as Error).message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      
      // 1. Ensure user is in the Organization
      const result = await ensureStudentInOrg(organizationId, email);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (!result.userId) {
        toast.error('Could not resolve user ID.');
        return;
      }

      // 2. Call the parent callback (e.g., to add to batch)
      await onStudentSelected(result.userId);
      
      setOpen(false);
      setEmail('');
      toast.success('Student added successfully');
    } catch (error) {
      console.error(error);
      toast.error('An error occurred while adding the student.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button className="bg-aceverse-blue hover:bg-aceverse-blue/90">
            <UserPlus className="mr-2 h-4 w-4" /> Add Student
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {availableStudents.length > 0 && (
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="select">Select Existing</TabsTrigger>
              <TabsTrigger value="email">Add by Email</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="select" className="space-y-4">
            <div className="space-y-2">
              <Label>Select Student</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student..." />
                </SelectTrigger>
                <SelectContent>
                  {availableStudents.map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {s.full_name || 'Unknown'} ({s.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} type="button">Cancel</Button>
              <Button onClick={handleSelectSubmit} disabled={!selectedId || loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Selected
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="email">
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Student Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the email address of the student you wish to add. They must have an account.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)} type="button">Cancel</Button>
                <Button type="submit" disabled={!email || loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add by Email
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
