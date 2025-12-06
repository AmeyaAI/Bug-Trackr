/**
 * Bug Details Page
 * 
 * Displays comprehensive bug information with comment thread.
 * Implements role-based action buttons for validation, closure, assignment, and status updates.
 * 
 * Requirements: 2.5, 3.1, 3.2, 4.3
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriorityIcon } from '@/components/PriorityIcon';
import { SeverityIcon } from '@/components/SeverityIcon';
import { TypeIcon } from '@/components/TypeIcon';
import { TagBadge } from '@/components/TagBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CommentSection } from '@/components/CommentSection';
import { bugApi, commentApi, handleApiError } from '@/utils/apiClient';
import { Bug, Comment, BugStatus, UserRole, getRolePermissions } from '@/utils/types';
import { getUserName as getNameFromUsers, getStatusBadgeVariant } from '@/utils/badgeHelpers';
import { useUser } from '@/contexts/UserContext';
import { useUsers, useProjects, useSprints } from '@/lib/hooks/useData';
import { useToast } from '@/contexts/ToastContext';
import { LoadingState } from '@/components/LoadingState';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BugActivityLog } from '@/components/BugActivityLog';
import { History, ArrowLeft, Layers, Calendar, Clock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export default function BugDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { currentUser } = useUser();
  const toast = useToast();
  
  const [bug, setBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Data hooks
  const { users } = useUsers();
  const { projects } = useProjects();
  const { sprints } = useSprints(bug?.projectId || 'all');

  // Derived state
  const project = projects.find(p => p.id === bug?.projectId) || null;
  const reportedByUser = users.find(u => u.id === bug?.reportedBy) || null;
  const assignedUser = users.find(u => u.id === bug?.assignedTo) || null;
  const sprint = sprints.find(s => s.id === bug?.sprintId) || null;
  
  // Dialog states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showSprintDialog, setShowSprintDialog] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<BugStatus | null>(null);
  const [selectedSprint, setSelectedSprint] = useState<string>('backlog');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);

  const loadBugDetails = useCallback(async (bugId: string, showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setLoadError(null);
    
    try {
      const bugData = await bugApi.getById(bugId);
      
      setBug(bugData.bug);
      setComments(bugData.comments);
      
    } catch (err) {
      console.error('Failed to load bug details:', err);
      const errorMessage = handleApiError(err);
      setLoadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadBugDetails(id);
    }
  }, [id, loadBugDetails]);

  const handleAddComment = async (bugId: string, message: string) => {
    if (!currentUser) {
      toast.error('Please select a user first');
      throw new Error('Please select a user first');
    }

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempComment: Comment = {
      id: tempId,
      bugId,
      authorId: currentUser.id,
      message,
      createdAt: new Date(),
    };

    // Update UI immediately
    setComments(prev => [...prev, tempComment]);

    try {
      await commentApi.create({
        bugId,
        authorId: currentUser.id,
        message,
      });
      
      toast.success('Comment added successfully');
      
      // Reload bug details in background to get real ID and any other updates
      if (id && typeof id === 'string') {
        await loadBugDetails(id, false);
      }
    } catch (err) {
      // Revert optimistic update on error
      setComments(prev => prev.filter(c => c.id !== tempId));
      const errorMessage = handleApiError(err);
      toast.error(errorMessage);
      throw err;
    }
  };

  const handleValidate = async () => {
    if (!currentUser || !bug) return;
    
    setIsSubmitting(true);
    try {
      const response = await bugApi.validate(bug.id, currentUser.id);
      
      if (response.bug) {
        setBug(response.bug);
      } else {
        await loadBugDetails(bug.id, false);
      }
      
      toast.success('Bug validated successfully');
    } catch (err) {
      console.error('Failed to validate bug:', err);
      const errorMessage = handleApiError(err);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!currentUser || !bug) return;
    
    if (!bug.validated) {
      toast.warning('Bug must be validated before closing');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await bugApi.updateStatus(bug.id, {
        status: BugStatus.CLOSED,
        userId: currentUser.id,
        userRole: currentUser.role as UserRole,
      });
      
      if (response.bug) {
        setBug(response.bug);
      } else {
        await loadBugDetails(bug.id, false);
      }
      
      toast.success('Bug closed successfully');
    } catch (err) {
      console.error('Failed to close bug:', err);
      const errorMessage = handleApiError(err);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!currentUser || !bug || !selectedAssignee) return;
    
    setIsSubmitting(true);
    try {
      const response = await bugApi.assign(bug.id, {
        assignedTo: selectedAssignee,
        assignedBy: currentUser.id,
      });
      
      if (response.bug) {
        setBug(response.bug);
      } else {
        await loadBugDetails(bug.id, false);
      }
      
      toast.success('Bug assigned successfully');
      setShowAssignDialog(false);
      setSelectedAssignee('');
    } catch (err) {
      console.error('Failed to assign bug:', err);
      const errorMessage = handleApiError(err);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!currentUser || !bug || !selectedStatus) return;
    
    setIsSubmitting(true);
    try {
      const response = await bugApi.updateStatus(bug.id, {
        status: selectedStatus,
        userId: currentUser.id,
        userRole: currentUser.role as UserRole,
      });
      
      if (response.bug) {
        setBug(response.bug);
      } else {
        await loadBugDetails(bug.id, false);
      }
      
      toast.success('Bug status updated successfully');
      setShowStatusDialog(false);
      setSelectedStatus(null);
    } catch (err) {
      console.error('Failed to update status:', err);
      const errorMessage = handleApiError(err);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveToSprint = async () => {
    if (!currentUser || !bug) return;
    
    setIsSubmitting(true);
    try {
      const sprintIdToUpdate = selectedSprint === 'backlog' ? null : selectedSprint;
      const updatedBug = await bugApi.updateSprint(bug.id, sprintIdToUpdate);
      
      setBug(updatedBug);
      
      toast.success('Bug moved to sprint successfully');
      setShowSprintDialog(false);
    } catch (err) {
      console.error('Failed to move bug to sprint:', err);
      const errorMessage = handleApiError(err);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Wrapper function to maintain compatibility
  const getUserName = (userId: string): string => {
    return getNameFromUsers(userId, users);
  };

  // Get role permissions
  const permissions = currentUser ? getRolePermissions(currentUser.role as UserRole) : null;

  if (isLoading) {
    return <LoadingState message="Loading bug details..." fullScreen />;
  }

  if (loadError || !bug) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-destructive">{loadError || 'Bug not found'}</p>
            <Button onClick={() => router.push('/bugs')}>Back to Bugs</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-background p-6">
      <div className="flex-1 w-full space-y-6">
        {/* Header with back button and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => router.push('/bugs')} className="w-fit pl-0 hover:pl-2 transition-all">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Bugs
          </Button>
          
          <div className="flex items-center gap-2">
             <Button variant="outline" onClick={() => setShowActivityLog(true)} className="gap-2">
                <History className="w-4 h-4" />
                Activity Log
             </Button>
             
             {/* Role-based action buttons */}
             {currentUser && permissions && (
               <>
                 {/* Tester-specific: Validation controls */}
                 {permissions.canValidateBug && !bug.validated && bug.status === BugStatus.RESOLVED && (
                   <Button onClick={handleValidate} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                     ✓ Validate
                   </Button>
                 )}
                 
                 {/* Tester-specific: Closure controls */}
                 {permissions.canCloseBug && bug.validated && bug.status !== BugStatus.CLOSED && (
                   <Button onClick={handleClose} disabled={isSubmitting} variant="secondary">
                     Close Bug
                   </Button>
                 )}
                 
                 {/* Developer-specific: Assignment controls */}
                 {permissions.canAssignBug && bug.status !== BugStatus.CLOSED && (
                   <Button 
                     variant="outline" 
                     onClick={() => {
                       setSelectedAssignee(bug.assignedTo || '');
                       setShowAssignDialog(true);
                     }}
                     disabled={isSubmitting}
                   >
                     {bug.assignedTo ? 'Reassign' : 'Assign'}
                   </Button>
                 )}
                 
                 {/* Developer-specific: Status update controls */}
                 {permissions.canUpdateStatus && bug.status !== BugStatus.CLOSED && (
                   <Button 
                     variant="outline" 
                     onClick={() => {
                       setSelectedStatus(bug.status);
                       setShowStatusDialog(true);
                     }}
                     disabled={isSubmitting}
                   >
                     Update Status
                   </Button>
                 )}

                 {/* Admin-specific: Move to Sprint */}
                 {currentUser.role === UserRole.ADMIN && (
                   <Button 
                     variant="outline" 
                     onClick={() => {
                       setSelectedSprint(bug.sprintId || 'backlog');
                       setShowSprintDialog(true);
                     }}
                     disabled={isSubmitting}
                   >
                     Move to Sprint
                   </Button>
                 )}
               </>
             )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted">
                    <TypeIcon type={bug.type} className="w-3.5 h-3.5" />
                    <span className="capitalize font-medium">{bug.type}</span>
                  </div>
                  <span>•</span>
                  <span className="font-mono text-xs">{bug.id}</span>
                  <span>•</span>
                  <span>{project?.name}</span>
                </div>
                <CardTitle className="text-3xl font-bold tracking-tight">{bug.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</h3>
                  <div className="bg-muted/30 rounded-lg p-6 border">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {bug.description}
                    </ReactMarkdown>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments Section */}
            {currentUser && (
              <CommentSection
                bugId={bug.id}
                comments={comments}
                currentUserId={currentUser.id}
                currentUserName={currentUser.name}
                onAddComment={handleAddComment}
                getUserName={getUserName}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Status */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={getStatusBadgeVariant(bug.status)} className="px-2.5 py-0.5">
                    {bug.status}
                  </Badge>
                </div>

                {/* Priority */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Priority</span>
                  <div className="flex items-center gap-2">
                    <PriorityIcon priority={bug.priority} />
                    <span className="text-sm font-medium">{bug.priority}</span>
                  </div>
                </div>

                {/* Severity */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Severity</span>
                  <div className="flex items-center gap-2">
                    <SeverityIcon severity={bug.severity} />
                    <span className="text-sm font-medium">{bug.severity}</span>
                  </div>
                </div>

                {/* Sprint */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Sprint</span>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{sprint ? sprint.name : 'Backlog'}</span>
                  </div>
                </div>

                {/* Validation Status */}
                {bug.validated && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Validation</span>
                    <Badge variant="secondary" className="text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800">
                      ✓ Validated
                    </Badge>
                  </div>
                )}

                {/* Tags */}
                {bug.tags && bug.tags.length > 0 && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-muted-foreground block mb-3">Tags</span>
                    <div className="flex flex-wrap gap-2">
                      {bug.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* People Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">People</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Assignee */}
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Assignee</span>
                  <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{assignedUser ? getInitials(assignedUser.name) : '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{assignedUser?.name || 'Unassigned'}</span>
                      {assignedUser && <span className="text-xs text-muted-foreground capitalize">{assignedUser.role}</span>}
                    </div>
                  </div>
                </div>

                {/* Reporter */}
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Reporter</span>
                  <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{reportedByUser ? getInitials(reportedByUser.name) : '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{reportedByUser?.name || 'Unknown'}</span>
                      {reportedByUser && <span className="text-xs text-muted-foreground capitalize">{reportedByUser.role}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates Card */}
            <Card className="shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">Created</span>
                    <span className="font-medium">
                      {new Date(bug.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">Updated</span>
                    <span className="font-medium">
                      {new Date(bug.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialogs */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Bug</DialogTitle>
              <DialogDescription>
                Select a user to assign this bug to
              </DialogDescription>
            </DialogHeader>
            
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssign} disabled={!selectedAssignee || isSubmitting}>
                {isSubmitting ? 'Assigning...' : 'Assign'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Status</DialogTitle>
              <DialogDescription>
                Change the bug status
              </DialogDescription>
            </DialogHeader>
            
            <Select 
              value={selectedStatus || undefined} 
              onValueChange={(value) => setSelectedStatus(value as BugStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BugStatus.OPEN}>{BugStatus.OPEN}</SelectItem>
                <SelectItem value={BugStatus.IN_PROGRESS}>{BugStatus.IN_PROGRESS}</SelectItem>
                <SelectItem value={BugStatus.RESOLVED}>{BugStatus.RESOLVED}</SelectItem>
              </SelectContent>
            </Select>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleStatusUpdate} disabled={!selectedStatus || isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showSprintDialog} onOpenChange={setShowSprintDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move to Sprint</DialogTitle>
              <DialogDescription>
                Select a sprint to move this bug to
              </DialogDescription>
            </DialogHeader>
            
            <Select 
              value={selectedSprint} 
              onValueChange={setSelectedSprint}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sprint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog (No Sprint)</SelectItem>
                {sprints.map(sprint => (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    {sprint.name} ({sprint.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSprintDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleMoveToSprint} disabled={isSubmitting}>
                {isSubmitting ? 'Moving...' : 'Move'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Activity Log Panel */}
        {bug && (
          <BugActivityLog 
            bugId={bug.id} 
            isOpen={showActivityLog} 
            onClose={() => setShowActivityLog(false)} 
          />
        )}
      </div>
    </div>
  );
}
