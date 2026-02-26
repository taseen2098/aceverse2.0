'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useStudentGroups } from '@/lib/hooks/useStudentGroups';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Users, Trash2, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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

export default function ManageBatchPage() {
  const { organizationId } = useParams();
  const { groups, isLoading, createGroup, deleteGroup } = useStudentGroups(organizationId as string);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');

  const handleCreate = async () => {
    if (!newBatchName.trim()) return;
    createGroup.mutate(newBatchName, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setNewBatchName('');
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-aceverse-navy">Student Batches</h1>
          <p className="text-muted-foreground mt-1">Create and manage groups of students.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-aceverse-blue hover:bg-aceverse-blue/90">
              <Plus className="mr-2 h-4 w-4" /> Create Batch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Batch</DialogTitle>
              <DialogDescription>
                Give your batch a name (e.g., &quot;Class of 2024&quot;, &quot;Physics A&quot;).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Batch Name</Label>
                <Input
                  id="name"
                  placeholder="Enter batch name"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createGroup.isPending}>
                {createGroup.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => {
          return <Card key={group.id} className="hover:border-aceverse-blue transition-colors group relative">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl text-aceverse-navy">{group.name}</CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {/* Future: Add student count here by joining group_members */}
              <p className="text-sm text-muted-foreground">Manage students in this batch.</p>
            </CardContent>
            <CardFooter className="flex justify-between pt-0">
              <Link href={`/org/${organizationId}/manage-batch/${group.id}`} className="w-full mr-2">
                <Button variant="outline" className="w-full group-hover:bg-aceverse-ice group-hover:text-aceverse-blue">
                  Manage Students <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the batch &quot;{group.name}&quot; and remove all student associations from it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteGroup.mutate(group.id)}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
})}
        
        {groups.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-gray-50/50">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No batches yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
              Create your first batch to start organizing students into groups.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} variant="outline">
              Create Batch
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
