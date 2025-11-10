/**
 * Bug Details Page
 * 
 * Displays comprehensive bug information with comment thread.
 * Implements role-based action buttons for validation, closure, assignment, and status updates.
 * 
 * Requirements: 2.5, 3.1, 3.2, 4.3
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { bugApi, projectApi, userApi, commentApi } from '@/utils/apiClient';
import { Bug, Comment, BugStatus, BugPriority, Project, User, UserRole, getRolePermissions } from '@/utils/types';
import { useUser } from '@/contexts/UserContext';

export default function BugDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { currentUser } = useUser();
  
  const [bug, setBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reportedByUser, setReportedByUser] = useState<User | null>(null);
  const [assignedUser, setAssignedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<BugStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id && typeof id === 'string') {
      loadBugDetails(id);
    }
  }, [id]);

  const loadBugDetails = async (bugId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [bugData, usersData] = await Promise.all([
        bugApi.getById(bugId),
        userApi.getAll(),
      ]);
      
      setBug(bugData.bug);
      setComments(bugData.comments);
      setUsers(usersData);
      
      // Load project details
      const projectData = await projectApi.getById(bugData.bug.projectId);
      setProject(projectData);
      
      // Find reported by and assigned users
      const reporter = usersData.find(u => u._id === bugData.bug.reportedBy);
      const assignee = bugData.bug.assignedTo 
        ? usersData.find(u => u._id === bugData.bug.assignedTo)
        : null;
      
      setReportedByUser(reporter || null);
      setAssignedUser(assignee || null);
    } catch (err) {
      console.error('Failed to load bug details:', err);
      setError('Failed to load bug details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async (bugId: string, message: string) => {
    if (!currentUser) {
      throw new Error('Please select a user first');
    }

    await commentApi.create({
      bugId,
      authorId: currentUser._id,
      message,
    });
    
    // Reload bug details to get updated comments
    if (id && typeof id === 'string') {
      await loadBugDetails(id);
    }
  };

  const handleValidate = async () => {
    if (!currentUser || !bug) return;
    
    setIsSubmitting(true);
    try {
      await bugApi.validate(bug._id, currentUser._id);
      await loadBugDetails(bug._id);
    } catch (err) {
      console.error('Failed to validate bug:', err);
      alert('Failed to validate bug');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!currentUser || !bug) return;
    
    if (!bug.validated) {
      alert('Bug must be validated before closing');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await bugApi.updateStatus(bug._id, {
        status: BugStatus.CLOSED,
        userId: currentUser._id,
        userRole: currentUser.role as any,
      });
      await loadBugDetails(bug._id);
    } catch (err) {
      console.error('Failed to close bug:', err);
      alert('Failed to close bug');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!currentUser || !bug || !selectedAssignee) return;
    
    setIsSubmitting(true);
    try {
      await bugApi.assign(bug._id, {
        assignedTo: selectedAssignee,
        assignedBy: currentUser._id,
      });
      await loadBugDetails(bug._id);
      setShowAssignDialog(false);
      setSelectedAssignee('');
    } catch (err) {
      console.error('Failed to assign bug:', err);
      alert('Failed to assign bug');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!currentUser || !bug || !selectedStatus) return;
    
    setIsSubmitting(true);
    try {
      await bugApi.updateStatus(bug._id, {
        status: selectedStatus,
        userId: currentUser._id,
        userRole: currentUser.role as any,
      });
      await loadBugDetails(bug._id);
      setShowStatusDialog(false);
      setSelectedStatus(null);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update bug status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserName = (userId: string): string => {
    const user = users.find(u => u._id === userId);
    return user?.name || 'Unknown User';
  };

  const getStatusVariant = (status: BugStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case BugStatus.OPEN: return "destructive";
      case BugStatus.IN_PROGRESS: return "default";
      case BugStatus.RESOLVED: return "secondary";
      case BugStatus.CLOSED: return "outline";
      default: return "outline";
    }
  };

  const getPriorityVariant = (priority: BugPriority): "default" | "secondary" | "destructive" | "outline" => {
    switch (priority) {
      case BugPriority.CRITICAL:
      case BugPriority.HIGH:
        return "destructive";
      case BugPriority.MEDIUM:
        return "default";
      case BugPriority.LOW:
        return "secondary";
      default:
        return "outline";
    }
  };

  // Get role permissions
  const permissions = currentUser ? getRolePermissions(currentUser.role as UserRole) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading bug details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !bug) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-destructive">{error || 'Bug not found'}</p>
            <Button onClick={() => router.push('/bugs')}>Back to Bugs</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
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
                <CardTitle className="text-2xl">{bug.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getStatusVariant(bug.status)}>{bug.status}</Badge>
                  <Badge variant={getPriorityVariant(bug.priority)}>{bug.priority}</Badge>
                  <Badge variant="outline">{bug.severity}</Badge>
                  {bug.validated && (
                    <Badge variant="secondary">✓ Validated</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{bug.description}</p>
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

            {/* Action buttons */}
            {currentUser && (
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {permissions?.canValidateBug && !bug.validated && bug.status === BugStatus.RESOLVED && (
                  <Button onClick={handleValidate} disabled={isSubmitting}>
                    Validate Bug
                  </Button>
                )}
                
                {permissions?.canCloseBug && bug.validated && bug.status !== BugStatus.CLOSED && (
                  <Button onClick={handleClose} disabled={isSubmitting}>
                    Close Bug
                  </Button>
                )}
                
                {permissions?.canAssignBug && (
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
                
                {permissions?.canUpdateStatus && bug.status !== BugStatus.CLOSED && (
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments section */}
        {currentUser && (
          <CommentSection
            bugId={bug._id}
            comments={comments}
            currentUserId={currentUser._id}
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
                  <SelectItem key={user._id} value={user._id}>
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
