import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useProject, useSprints, useUsers } from '@/lib/hooks/useData';
import { bugApi } from '@/utils/apiClient';
import { Bug, BugStatus, UserRole, BugTag } from '@/utils/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CalendarIcon, Target, AlertCircle, CheckCircle2, Clock, ArrowLeft } from 'lucide-react';
import { BugCard } from '@/components/BugCard';
import { KanbanBoard, KanbanCard, KanbanCards, KanbanHeader, KanbanProvider } from '@/components/ui/shadcn-io/kanban';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useUser } from '@/contexts/UserContext';
import { getUserName } from '@/utils/badgeHelpers';
import { ValidationDialog } from '@/components/ValidationDialog';

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
};

const formatDateYear = (date: Date | string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
};

export default function SprintBoardPage() {
  const router = useRouter();
  const { projectId, sprintId } = router.query;
  const { currentUser } = useUser();
  
  const { project } = useProject(projectId as string);
  const { sprints } = useSprints(projectId as string);
  const { users } = useUsers();
  
  const [dragStartStatus, setDragStartStatus] = useState<BugStatus | null>(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [pendingBugId, setPendingBugId] = useState<string | null>(null);

  // Find current sprint from the cached list
  const sprint = useMemo(() => 
    sprints.find(s => s.id === sprintId), 
    [sprints, sprintId]
  );

  // Fetch bugs for this sprint
  const { data: bugsData, mutate } = useSWR(
    sprintId ? `/api/bugs?sprintId=${sprintId}` : null,
    () => bugApi.getPaginated(100, undefined, { sprintId: sprintId as string }),
    {
      revalidateOnFocus: false,
    }
  );

  const bugs = useMemo(() => bugsData?.bugs || [], [bugsData]);

  // Calculate progress
  const progress = useMemo(() => {
    if (bugs.length === 0) return 0;
    const completed = bugs.filter(b => b.status === BugStatus.CLOSED).length;
    return Math.round((completed / bugs.length) * 100);
  }, [bugs]);

  const columns = useMemo(() => [
    { id: BugStatus.OPEN, title: 'To Do', icon: AlertCircle, color: 'text-red-500' },
    { id: BugStatus.IN_PROGRESS, title: 'In Progress', icon: Clock, color: 'text-yellow-500' },
    { id: BugStatus.RESOLVED, title: 'Resolved', icon: CheckCircle2, color: 'text-green-500' },
    { id: BugStatus.CLOSED, title: 'Done', icon: CheckCircle2, color: 'text-blue-500' },
  ], []);

  const kanbanColumns = useMemo(() => columns.map(c => ({ id: c.id, name: c.title })), [columns]);

  const handleStatusUpdate = async (bugId: string, newStatus: BugStatus) => {
    try {
      if (currentUser) {
        await bugApi.updateStatus(bugId, {
          status: newStatus,
          userId: currentUser.id,
          userRole: currentUser.role as UserRole
        });
        mutate(); 
      }
    } catch (error) {
      console.error('Failed to update bug status:', error);
    }
  };

  const handleAssign = async (bugId: string, userId: string) => {
    try {
      if (currentUser) {
        await bugApi.assign(bugId, {
          assignedTo: userId === 'unassigned' ? '' : userId,
          assignedBy: currentUser.id
        });
        mutate();
      }
    } catch (err) {
      console.error('Failed to assign bug:', err);
    }
  };

  const handleUpdateTags = async (bugId: string, tags: BugTag[]) => {
    try {
      await bugApi.updateTags(bugId, tags);
      mutate();
    } catch (err) {
      console.error('Failed to update tags:', err);
    }
  };

  const handleValidate = async (bugId: string) => {
    try {
      if (currentUser) {
        await bugApi.validate(bugId, currentUser.id, currentUser.role);
        mutate();
      }
    } catch (err) {
      console.error('Failed to validate bug:', err);
    }
  };

  const handleKanbanDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const currentColumn = active.data.current?.column as BugStatus;
    if (currentColumn) {
      setDragStartStatus(currentColumn);
    }
  };

  const handleKanbanDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setDragStartStatus(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Get the original status from the drag start event
    const oldStatus = dragStartStatus;
    
    // Reset drag start status
    setDragStartStatus(null);

    // Find the bug that was moved
    const bug = bugs.find(b => b.id === activeId);
    if (!bug) return;

    // Determine new status
    let newStatus: BugStatus | undefined;

    // If dropped on a column
    if (Object.values(BugStatus).includes(overId as BugStatus)) {
      newStatus = overId as BugStatus;
    } else {
      // If dropped on another card, find that card's status
      const overBug = bugs.find(b => b.id === overId);
      if (overBug) {
        newStatus = overBug.status;
      }
    }

    // Compare with oldStatus from the start of the drag
    if (newStatus && oldStatus && newStatus !== oldStatus) {
      // Check for validation requirement
      if (newStatus === BugStatus.CLOSED && !bug.validated) {
        setPendingBugId(bug.id);
        setValidationDialogOpen(true);
        // Revert changes immediately
        mutate(); 
        return;
      }

      // Optimistic update: Invalidate if moving from CLOSED
      if (oldStatus === BugStatus.CLOSED && newStatus !== BugStatus.CLOSED) {
        if (bugsData) {
          const updatedBugs = bugs.map(b => 
            b.id === bug.id ? { ...b, validated: false } : b
          );
          mutate({ ...bugsData, bugs: updatedBugs }, false);
        }
      }

      try {
        if (currentUser) {
          await bugApi.updateStatus(bug.id, { 
            status: newStatus,
            userId: currentUser.id,
            userRole: currentUser.role as UserRole
          });
        }
      } catch (error) {
        console.error('Failed to update bug status:', error);
        // Revert changes on error (reload data)
        mutate();
      }
    }
  };

  const handleValidationConfirm = async () => {
    if (pendingBugId && currentUser) {
      const bugToUpdate = bugs.find(b => b.id === pendingBugId);
      if (!bugToUpdate) return;

      // Optimistic update
      const updatedBugs = bugs.map(b => 
        b.id === pendingBugId 
          ? { ...b, status: BugStatus.CLOSED, validated: true } 
          : b
      );
      
      if (bugsData) {
        mutate({ ...bugsData, bugs: updatedBugs }, false);
      }

      setValidationDialogOpen(false);
      const bugId = pendingBugId;
      setPendingBugId(null);

      try {
        // Validate first
        await bugApi.validate(bugId, currentUser.id, currentUser.role);
        // Then update status to CLOSED
        await bugApi.updateStatus(bugId, {
          status: BugStatus.CLOSED,
          userId: currentUser.id,
          userRole: currentUser.role as UserRole
        });
        // Revalidate to ensure consistency
        mutate();
      } catch (error) {
        console.error('Failed to validate and close bug:', error);
        // Revert changes on error (reload data)
        mutate();
      }
    }
  };

  const handleValidationCancel = () => {
    setValidationDialogOpen(false);
    setPendingBugId(null);
  };

  if (!sprint) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-muted-foreground">Loading sprint details...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50/50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sprints
          </Button>
          <div className="h-4 w-px bg-gray-200" />
          <span className="text-sm text-muted-foreground">{project?.name}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{sprint.name}</h1>
              <Badge variant={sprint.status === 'active' ? 'default' : 'secondary'}>
                {sprint.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                {formatDate(sprint.startDate)} - {formatDateYear(sprint.endDate)}
              </div>
              {sprint.goal && (
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {sprint.goal}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm font-medium mb-1">Sprint Progress</div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm font-bold">{progress}%</span>
              </div>
            </div>
            <div className="flex -space-x-2">
              {/* Placeholder for assignees avatars */}
              {Array.from(new Set(bugs.map(b => b.assignedTo).filter(Boolean))).slice(0, 4).map((userId, i) => (
                <Avatar key={userId as string} className="border-2 border-white w-8 h-8">
                  <AvatarFallback className="text-xs">U{i+1}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full min-w-[1000px]">
          <KanbanProvider
            className="flex gap-6 h-full min-w-[1000px]"
            columns={kanbanColumns}
            data={bugs.map(b => ({ ...b, name: b.title, column: b.status }))}
            onDataChange={(newData) => {
              // Reconstruct bugs from newData to preserve order
              const bugsMap = new Map(bugs.map(b => [b.id, b]));
              const newBugs = newData.map(item => {
                const bug = bugsMap.get(item.id);
                if (bug) {
                  return { ...bug, status: item.column as BugStatus };
                }
                return null;
              }).filter(Boolean) as Bug[];
              
              if (bugsData) {
                mutate({ ...bugsData, bugs: newBugs }, false);
              }
            }}
            onDragStart={handleKanbanDragStart}
            onDragEnd={handleKanbanDragEnd}
          >
            {(column) => {
              const colConfig = columns.find(c => c.id === column.id);
              const Icon = colConfig?.icon || AlertCircle;
              const colorClass = colConfig?.color || 'text-gray-500';
              
              return (
                <KanbanBoard key={column.id} id={column.id} className="flex-1 flex flex-col min-w-[280px] bg-gray-100/50 rounded-lg p-4 border-0">
                  <KanbanHeader className="p-0 mb-4 bg-transparent border-0">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${colorClass}`} />
                        <h3 className="font-semibold text-sm text-gray-700">{column.name}</h3>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {bugs.filter(b => b.status === column.id).length}
                        </Badge>
                      </div>
                    </div>
                  </KanbanHeader>
                  <KanbanCards id={column.id} className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {(item) => {
                      const bug = item as unknown as Bug;
                      return (
                        <KanbanCard 
                          key={bug.id} 
                          id={bug.id} 
                          name={bug.title} 
                          column={bug.status}
                          className="p-0 border-0 shadow-none bg-transparent"
                        >
                          <BugCard 
                            bug={bug}
                            assignedUserName={bug.assignedTo ? getUserName(bug.assignedTo, users) : undefined}
                            users={users}
                            onStatusUpdate={handleStatusUpdate}
                            onAssign={handleAssign}
                            onUpdateTags={handleUpdateTags}
                            onValidate={handleValidate}
                            onViewDetails={() => window.open(`/bugs/${bug.id}`, '_blank')}
                          />
                        </KanbanCard>
                      );
                    }}
                  </KanbanCards>
                </KanbanBoard>
              );
            }}
          </KanbanProvider>
        </div>
      </div>

      <ValidationDialog 
        open={validationDialogOpen} 
        onOpenChange={setValidationDialogOpen}
        onValidate={handleValidationConfirm}
        onCancel={handleValidationCancel}
      />
    </div>
  );
}