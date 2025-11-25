/**
 * Bug List Page
 * 
 * Displays all bugs with filtering by status and priority.
 * Provides navigation to bug details and creation pages.
 * 
 * Requirements: 2.1, 5.2
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriorityIcon } from '@/components/PriorityIcon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { bugApi, userApi, projectApi } from '@/utils/apiClient';
import { Bug, BugStatus, BugPriority, User, Project, UserRole } from '@/utils/types';
import { useUser } from '@/contexts/UserContext';
import { LoadingState } from '@/components/LoadingState';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { getStatusBadgeVariant, getPriorityBadgeVariant, formatRelativeTime, getUserName, getProjectName } from '@/utils/badgeHelpers';
import { KanbanBoard, KanbanCard, KanbanCards, KanbanHeader, KanbanProvider } from '@/components/ui/shadcn-io/kanban';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { LayoutGrid, List } from 'lucide-react';

export default function BugsPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [dragStartStatus, setDragStartStatus] = useState<BugStatus | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      const [bugsData, usersData, projectsData] = await Promise.all([
        bugApi.getAll(),
        userApi.getAll(),
        projectApi.getAll(),
      ]);
      
      setBugs(bugsData);
      setUsers(usersData);
      setProjects(projectsData);
      
    } catch (err) {
      console.error('Failed to load bugs:', err);
      setLoadError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (bugId: string) => {
    router.push(`/bugs/${bugId}`);
  };

  const handleCreateBug = () => {
    router.push('/bugs/new');
  };

  // Filter bugs based on selected filters
  const filteredBugs = bugs.filter(bug => {
    const matchesStatus = statusFilter === 'all' || bug.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || bug.priority === priorityFilter;
    const matchesSearch = searchQuery === '' || 
      bug.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const kanbanColumns = [
    { id: BugStatus.OPEN, name: 'Open' },
    { id: BugStatus.IN_PROGRESS, name: 'In Progress' },
    { id: BugStatus.RESOLVED, name: 'Resolved' },
    { id: BugStatus.CLOSED, name: 'Closed' },
  ];

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
      try {
        // Optimistic update is handled by onDataChange, but we need to ensure consistency
        // Actually, onDataChange updates the list order and column in local state.
        // We just need to persist the status change.
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
        loadData();
      }
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading bugs..." fullScreen />;
  }

  if (loadError) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <ApiErrorFallback
            error={loadError}
            onRetry={loadData}
            title="Failed to load bugs"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">All Bugs</h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all reported bugs
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-md p-1 bg-muted/20">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 px-3"
              >
                <List className="h-4 w-4 mr-2" />
                Table
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="h-8 px-3"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Kanban
              </Button>
            </div>
            {currentUser && (
              <Button onClick={handleCreateBug}>
                Create Bug
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search bugs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:max-w-xs"
          />
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value={BugStatus.OPEN}>{BugStatus.OPEN}</SelectItem>
              <SelectItem value={BugStatus.IN_PROGRESS}>{BugStatus.IN_PROGRESS}</SelectItem>
              <SelectItem value={BugStatus.RESOLVED}>{BugStatus.RESOLVED}</SelectItem>
              <SelectItem value={BugStatus.CLOSED}>{BugStatus.CLOSED}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value={BugPriority.HIGHEST}>
                <div className="flex items-center gap-2">
                  <PriorityIcon priority={BugPriority.HIGHEST} />
                  {BugPriority.HIGHEST}
                </div>
              </SelectItem>
              <SelectItem value={BugPriority.HIGH}>
                <div className="flex items-center gap-2">
                  <PriorityIcon priority={BugPriority.HIGH} />
                  {BugPriority.HIGH}
                </div>
              </SelectItem>
              <SelectItem value={BugPriority.MEDIUM}>
                <div className="flex items-center gap-2">
                  <PriorityIcon priority={BugPriority.MEDIUM} />
                  {BugPriority.MEDIUM}
                </div>
              </SelectItem>
              <SelectItem value={BugPriority.LOW}>
                <div className="flex items-center gap-2">
                  <PriorityIcon priority={BugPriority.LOW} />
                  {BugPriority.LOW}
                </div>
              </SelectItem>
              <SelectItem value={BugPriority.LOWEST}>
                <div className="flex items-center gap-2">
                  <PriorityIcon priority={BugPriority.LOWEST} />
                  {BugPriority.LOWEST}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredBugs.length} of {bugs.length} bugs
        </div>

        {viewMode === 'table' ? (
          /* Bug table */
          filteredBugs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <p className="text-muted-foreground">No bugs found</p>
              <Button variant="outline" onClick={handleCreateBug}>
                Create First Bug
              </Button>
            </div>
          ) : (
            <div className="bg-card rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Title</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Project</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Priority</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Assignee</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBugs.map((bug) => (
                      <tr 
                        key={bug.id} 
                        className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => handleViewDetails(bug.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{bug.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">{getProjectName(bug.projectId, projects)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getPriorityBadgeVariant(bug.priority)} className="flex items-center gap-1 w-fit">
                            <PriorityIcon priority={bug.priority} />
                            {bug.priority}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getStatusBadgeVariant(bug.status)}>
                            {bug.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {bug.assignedTo ? (
                              <>
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                  {getUserName(bug.assignedTo, users).charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm">{getUserName(bug.assignedTo, users)}</span>
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">Unassigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {formatRelativeTime(bug.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          /* Kanban Board */
          <div className="h-[calc(100vh-300px)] min-h-[500px]">
            <KanbanProvider
              columns={kanbanColumns}
              data={filteredBugs.map(b => ({ ...b, name: b.title, column: b.status }))}
              onDataChange={(newData) => {
                // Update local state to reflect drag changes immediately
                // We need to map back from KanbanItemProps to Bug
                // Note: newData contains all items, but filteredBugs might be a subset.
                // If we are filtering, drag and drop might be weird if we update the main 'bugs' state with only filtered items.
                // However, KanbanProvider only manages the items passed to it.
                // If we update 'bugs' with 'newData', we might lose items that were filtered out.
                // So we should only update the items that are in newData.
                
                const updatedBugsMap = new Map(newData.map(item => [item.id, item]));
                
                setBugs(prevBugs => prevBugs.map(bug => {
                  const updatedItem = updatedBugsMap.get(bug.id);
                  if (updatedItem) {
                    return { ...bug, status: updatedItem.column as BugStatus };
                  }
                  return bug;
                }));
              }}
              onDragStart={handleKanbanDragStart}
              onDragEnd={handleKanbanDragEnd}
            >
              {(column) => (
                <KanbanBoard key={column.id} id={column.id}>
                  <KanbanHeader>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{column.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        {filteredBugs.filter(b => b.status === column.id).length}
                      </Badge>
                    </div>
                  </KanbanHeader>
                  <KanbanCards id={column.id}>
                    {(item) => {
                      const bug = item as unknown as Bug;
                      return (
                        <KanbanCard key={bug.id} id={bug.id} name={bug.title} column={bug.status} className="cursor-pointer" onClick={() => handleViewDetails(bug.id)}>
                          <div className="flex flex-col gap-2">
                            <div className="font-medium text-sm">{bug.title}</div>
                            <div className="flex items-center justify-between mt-2">
                              <Badge variant={getPriorityBadgeVariant(bug.priority)} className="text-[10px] px-1 py-0 h-5">
                                {bug.priority}
                              </Badge>
                              {bug.assignedTo && (
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium" title={getUserName(bug.assignedTo, users)}>
                                  {getUserName(bug.assignedTo, users).charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          </div>
                        </KanbanCard>
                      );
                    }}
                  </KanbanCards>
                </KanbanBoard>
              )}
            </KanbanProvider>
          </div>
        )}
      </div>
    </div>
  );
}
