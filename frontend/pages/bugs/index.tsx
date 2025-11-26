/**
 * Bug List Page
 * 
 * Displays all bugs with filtering by status and priority.
 * Provides navigation to bug details and creation pages.
 * 
 * Requirements: 2.1, 5.2
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriorityIcon } from '@/components/PriorityIcon';
import { Input } from '@/components/ui/input';
import { bugApi, userApi, projectApi } from '@/utils/apiClient';
import { Bug, BugStatus, BugPriority, User, Project, UserRole } from '@/utils/types';
import { useUser } from '@/contexts/UserContext';
import { LoadingState } from '@/components/LoadingState';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { getStatusBadgeVariant, getPriorityBadgeVariant, formatRelativeTime, getUserName, getProjectName } from '@/utils/badgeHelpers';
import { KanbanBoard, KanbanCard, KanbanCards, KanbanHeader, KanbanProvider } from '@/components/ui/shadcn-io/kanban';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { LayoutGrid, List, Filter, ChevronsUpDownIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  TableBody,
  TableCell,
  TableColumnHeader,
  TableHead,
  TableHeader,
  TableProvider,
  TableRow,
  TableHeaderGroup,
} from '@/components/ui/shadcn-io/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ColumnDef } from '@tanstack/react-table';

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
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [dragStartStatus, setDragStartStatus] = useState<BugStatus | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const cursorsRef = useRef(cursors);
  const [hasMore, setHasMore] = useState(false);
  const PAGE_SIZE = 10;

  useEffect(() => {
    cursorsRef.current = cursors;
  }, [cursors]);

  const loadData = useCallback(async (targetPage: number = 1, overrideCursor?: string | null) => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      const cursorToUse = overrideCursor !== undefined ? overrideCursor : cursorsRef.current[targetPage - 1];

      const [bugsData, usersData, projectsData] = await Promise.all([
        bugApi.getPaginated(PAGE_SIZE, cursorToUse || undefined, {
            projectId: projectFilter,
            status: statusFilter,
            assignedTo: assigneeFilter,
            priority: priorityFilter,
            search: searchQuery
        }),
        users.length ? Promise.resolve(users) : userApi.getAll(),
        projects.length ? Promise.resolve(projects) : projectApi.getAll(),
      ]);
      
      setBugs(bugsData.bugs);
      if (!users.length) setUsers(usersData);
      if (!projects.length) setProjects(projectsData);
      
      setPage(targetPage);
      
      if (bugsData.lastEvaluatedKey) {
          const nextCursor = JSON.stringify(bugsData.lastEvaluatedKey);
          setCursors(prev => {
              // If we reset (targetPage=1 and overrideCursor=null), we clear future cursors
              if (overrideCursor === null) {
                  return [null, nextCursor];
              }
              const newCursors = [...prev];
              newCursors[targetPage] = nextCursor;
              return newCursors;
          });
          setHasMore(true);
      } else {
          setHasMore(false);
          if (overrideCursor === null) {
              setCursors([null]);
          }
      }
      
    } catch (err) {
      console.error('Failed to load bugs:', err);
      setLoadError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, projectFilter, assigneeFilter, priorityFilter, searchQuery, users, projects]);

  useEffect(() => {
    const timer = setTimeout(() => {
        loadData(1, null);
    }, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleViewDetails = (bugId: string) => {
    router.push(`/bugs/${bugId}`);
  };

  const handleCreateBug = () => {
    router.push('/bugs/new');
  };

  // Filter bugs based on selected filters
  // With server-side pagination, bugs are already filtered
  const filteredBugs = bugs;

  const columns: ColumnDef<Bug>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Title" className="text-base" />
      ),
      cell: ({ row }) => <div className="font-medium text-foreground text-base">{row.getValue('title')}</div>,
    },
    {
      accessorKey: 'projectId',
      header: () => (
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 data-[state=open]:bg-accent text-base"
              >
                <span>Project</span>
                {projectFilter !== 'all' ? (
                  <Filter className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setProjectFilter('all')}>
                All Projects
              </DropdownMenuItem>
              {projects.map((project) => (
                <DropdownMenuItem key={project.id} onClick={() => setProjectFilter(project.id)}>
                  {project.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      cell: ({ row }) => (
        <span className="text-base text-muted-foreground">
          {getProjectName(row.getValue('projectId'), projects)}
        </span>
      ),
    },
    {
      accessorKey: 'priority',
      header: () => (
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 data-[state=open]:bg-accent text-base"
              >
                <span>Priority</span>
                {priorityFilter !== 'all' ? (
                  <Filter className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setPriorityFilter('all')}>
                All Priorities
              </DropdownMenuItem>
              {Object.values(BugPriority).map((priority) => (
                <DropdownMenuItem key={priority} onClick={() => setPriorityFilter(priority)}>
                  <Badge variant={getPriorityBadgeVariant(priority)} className="mr-2 flex items-center gap-1">
                    <PriorityIcon priority={priority} />
                    {priority}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      cell: ({ row }) => {
        const priority = row.getValue('priority') as BugPriority;
        return (
          <Badge variant={getPriorityBadgeVariant(priority)} className="flex items-center gap-1 w-fit text-sm px-2 py-1">
            <PriorityIcon priority={priority} />
            {priority}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: () => (
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 data-[state=open]:bg-accent text-base"
              >
                <span>Status</span>
                {statusFilter !== 'all' ? (
                  <Filter className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter(BugStatus.OPEN)}>
                <Badge variant={getStatusBadgeVariant(BugStatus.OPEN)} className="mr-2">{BugStatus.OPEN}</Badge>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter(BugStatus.IN_PROGRESS)}>
                <Badge variant={getStatusBadgeVariant(BugStatus.IN_PROGRESS)} className="mr-2">{BugStatus.IN_PROGRESS}</Badge>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter(BugStatus.RESOLVED)}>
                <Badge variant={getStatusBadgeVariant(BugStatus.RESOLVED)} className="mr-2">{BugStatus.RESOLVED}</Badge>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter(BugStatus.CLOSED)}>
                <Badge variant={getStatusBadgeVariant(BugStatus.CLOSED)} className="mr-2">{BugStatus.CLOSED}</Badge>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as BugStatus;
        return (
          <Badge variant={getStatusBadgeVariant(status)} className="text-sm px-2 py-1">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'assignedTo',
      header: () => (
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 data-[state=open]:bg-accent text-base"
              >
                <span>Assignee</span>
                {assigneeFilter !== 'all' ? (
                  <Filter className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setAssigneeFilter('all')}>
                All Assignees
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAssigneeFilter('unassigned')}>
                 Unassigned
              </DropdownMenuItem>
              {users.map((user) => (
                <DropdownMenuItem key={user.id} onClick={() => setAssigneeFilter(user.id)}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{user.name}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      cell: ({ row }) => {
        const assignedTo = row.getValue('assignedTo') as string | undefined;
        return (
          <div className="flex items-center gap-2">
            {assignedTo ? (
              <>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                  {getUserName(assignedTo, users).charAt(0).toUpperCase()}
                </div>
                <span className="text-base">{getUserName(assignedTo, users)}</span>
              </>
            ) : (
              <span className="text-base text-muted-foreground">Unassigned</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Created" className="text-base" />
      ),
      cell: ({ row }) => (
        <span className="text-base text-muted-foreground">
          {formatRelativeTime(row.getValue('createdAt'))}
        </span>
      ),
    },
  ];

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
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredBugs.length} bugs on this page (Page {page})
        </div>

        {viewMode === 'table' ? (
          /* Bug table */
            <div className="bg-card rounded-lg border">
              <TableProvider columns={columns} data={filteredBugs}>
                <TableHeader>
                  {({ headerGroup }) => (
                    <TableHeaderGroup key={headerGroup.id} headerGroup={headerGroup}>
                      {({ header }) => <TableHead key={header.id} header={header} className="h-12" />}
                    </TableHeaderGroup>
                  )}
                </TableHeader>
                <TableBody emptyContent={
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <p className="text-muted-foreground">No bugs found</p>
                    <Button variant="outline" onClick={handleCreateBug}>
                      Create First Bug
                    </Button>
                  </div>
                }>
                  {({ row }) => (
                    <TableRow
                      key={row.id}
                      row={row}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => handleViewDetails((row.original as Bug).id)}
                    >
                      {({ cell }) => (
                        <TableCell key={cell.id} cell={cell} className="p-4" />
                      )}
                    </TableRow>
                  )}
                </TableBody>
              </TableProvider>
            </div>
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

        {/* Pagination */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(page - 1)}
            disabled={page === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm font-medium">
            Page {page}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(page + 1)}
            disabled={!hasMore || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
