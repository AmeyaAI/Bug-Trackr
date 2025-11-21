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
import { bugApi, projectApi, userApi, commentApi, handleApiError, ApiErrorResponse } from '@/utils/apiClient';
import { Bug, Comment, BugStatus, Project, User, UserRole, getRolePermissions } from '@/utils/types';
import { getUserName as getNameFromUsers, getStatusBadgeVariant, getPriorityBadgeVariant, getSeverityBadgeVariant } from '@/utils/badgeHelpers';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/contexts/ToastContext';
import { LoadingState } from '@/components/LoadingState';
import { handleEventualConsistency } from '@/utils/apiHelpers';
import { AxiosError } from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function BugDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { currentUser } = useUser();
  const toast = useToast();
  
  const [bug, setBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reportedByUser, setReportedByUser] = useState<User | null>(null);
  const [assignedUser, setAssignedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Dialog states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<BugStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBugDetails = useCallback(async (bugId: string) => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      const [bugData, usersData] = await Promise.all([
        bugApi.getById(bugId),
        userApi.getAll(),
      ]);
      
      setBug(bugData.bug);
      setComments(bugData.comments);
      setUsers(usersData);
      
      // Load project details
      if (bugData.bug.projectId) {
        try {
          const projectData = await projectApi.getById(bugData.bug.projectId);
          setProject(projectData);
        } catch (err) {
          console.warn('Failed to load project details:', err);
          // Don't fail the whole page load if project fails
        }
      }
      
      // Find reported by and assigned users
      const reporter = usersData.find(u => u.id === bugData.bug.reportedBy);
      const assignee = bugData.bug.assignedTo 
        ? usersData.find(u => u.id === bugData.bug.assignedTo)
        : null;
      
      setReportedByUser(reporter || null);
      setAssignedUser(assignee || null);
    } catch (err) {
      console.error('Failed to load bug details:', err);
      const errorMessage = handleApiError(err as AxiosError<ApiErrorResponse>);
      setLoadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
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

    try {
      await commentApi.create({
        bugId,
        authorId: currentUser.id,
        message,
      });
      
      toast.success('Comment added successfully');
      
      // Reload bug details to get updated comments
      if (id && typeof id === 'string') {
        await loadBugDetails(id);
      }
    } catch (err) {
      const errorMessage = handleApiError(err as AxiosError<ApiErrorResponse>);
      toast.error(errorMessage);
      throw err;
    }
  };

  const handleValidate = async () => {
    if (!currentUser || !bug) return;
    
    setIsSubmitting(true);
    try {
      await handleEventualConsistency(
        () => bugApi.validate(bug.id, currentUser.id, currentUser.role),
        () => loadBugDetails(bug.id)
      );
      toast.success('Bug validated successfully');
    } catch (err) {
      console.error('Failed to validate bug:', err);
      const errorMessage = handleApiError(err as AxiosError<ApiErrorResponse>);
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
      await handleEventualConsistency(
        () => bugApi.updateStatus(bug.id, {
          status: BugStatus.CLOSED,
          userId: currentUser.id,
          userRole: currentUser.role as UserRole,
        }),
        () => loadBugDetails(bug.id)
      );
      toast.success('Bug closed successfully');
    } catch (err) {
      console.error('Failed to close bug:', err);
      const errorMessage = handleApiError(err as AxiosError<ApiErrorResponse>);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!currentUser || !bug || !selectedAssignee) return;
    
    setIsSubmitting(true);
    try {
      await handleEventualConsistency(
        () => bugApi.assign(bug.id, {
          assignedTo: selectedAssignee,
          assignedBy: currentUser.id,
        }),
        () => loadBugDetails(bug.id)
      );
      toast.success('Bug assigned successfully');
      setShowAssignDialog(false);
      setSelectedAssignee('');
    } catch (err) {
      console.error('Failed to assign bug:', err);
      const errorMessage = handleApiError(err as AxiosError<ApiErrorResponse>);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!currentUser || !bug || !selectedStatus) return;
    
    setIsSubmitting(true);
    try {
      await handleEventualConsistency(
        () => bugApi.updateStatus(bug.id, {
          status: selectedStatus,
          userId: currentUser.id,
          userRole: currentUser.role as UserRole,
        }),
        () => loadBugDetails(bug.id)
      );
      toast.success('Bug status updated successfully');
      setShowStatusDialog(false);
      setSelectedStatus(null);
    } catch (err) {
      console.error('Failed to update status:', err);
      const errorMessage = handleApiError(err as AxiosError<ApiErrorResponse>);
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
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/bugs')}>
            ← Back
          </Button>
        </div>

        {/* Bug details card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-2xl mb-4">{bug.title}</CardTitle>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium text-sm">Status:</span>
                    <Badge variant={getStatusBadgeVariant(bug.status)} className="text-sm px-2.5 py-1">
                      {bug.status || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium text-sm">Priority:</span>
                    <Badge variant={getPriorityBadgeVariant(bug.priority)} className="flex items-center gap-1.5 text-sm px-2.5 py-1">
                      <PriorityIcon priority={bug.priority} />
                      {bug.priority || 'N/A'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium text-sm">Severity:</span>
                    <Badge variant={getSeverityBadgeVariant(bug.severity)} className="flex items-center gap-1.5 text-sm px-2.5 py-1">
                      <SeverityIcon severity={bug.severity} />
                      {bug.severity || 'N/A'}
                    </Badge>
                  </div>
                  {bug.validated && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium text-sm">Validation:</span>
                      <Badge variant="secondary" className="text-sm px-2.5 py-1">
                        ✓ Validated
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <div className="bg-muted/70 rounded-lg p-4 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {bug.description}
                </ReactMarkdown>
              </div>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Project</p>
                <p className="font-medium">{project?.name || 'Loading...'}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Reported By</p>
                <p className="font-medium">{reportedByUser?.name || 'Unknown'}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Assigned To</p>
                <p className="font-medium">{assignedUser?.name || 'Unassigned'}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {new Date(bug.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Role-based action buttons */}
            {currentUser && permissions && (
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {/* Tester-specific: Validation controls */}
                {permissions.canValidateBug && !bug.validated && bug.status === BugStatus.RESOLVED && (
                  <Button onClick={handleValidate} disabled={isSubmitting}>
                    ✓ Validate Bug
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

                {/* Show message if no actions available */}
                {!permissions.canValidateBug && 
                 !permissions.canCloseBug && 
                 !permissions.canAssignBug && 
                 !permissions.canUpdateStatus && (
                  <p className="text-sm text-muted-foreground">
                    No actions available for your role
                  </p>
                )}
              </div>
            )}

            {/* Prompt to select user if not logged in */}
            {!currentUser && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Please select a user from the navigation to perform actions
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments section */}
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

        {/* Assign dialog */}
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

        {/* Status update dialog */}
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
      </div>
    </div>
  );
}
