/**
 * Project-Specific Bug Page
 * 
 * Filters bugs by selected project and displays project context information.
 * Maintains all bug management functionality within project scope.
 * 
 * Requirements: 5.2, 5.5
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PriorityIcon } from '@/components/PriorityIcon';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { bugApi, projectApi } from '@/utils/apiClient';
import { Bug, BugStatus, BugPriority, Project } from '@/utils/types';
import { BugType } from '@/lib/models/bug';
import { useUser } from '@/contexts/UserContext';
import { useUsers } from '@/lib/hooks/useData';
import { LoadingState } from '@/components/LoadingState';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { getStatusBadgeVariant, getPriorityBadgeVariant, formatRelativeTime, getUserName } from '@/utils/badgeHelpers';
import { Filter, ChevronsUpDownIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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

// Bug type display helper
const BUG_TYPE_CONFIG: Record<BugType, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  bug: { 
    label: 'Bug', 
    icon: (
      <svg 
        fill="currentColor" 
        className="h-3 w-3"
        version="1.1" 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 314.009 314.009"
      >
        <path d="M310.008,242.584l-44.275-39.615c-3.384-3.029-8.188-3.889-12.41-2.221l-3.699,1.461c1.719-8.662,2.636-17.699,2.636-26.998
          c0-17.793-3.337-34.645-9.291-49.691l12.276-4.844L294,155.355c2.29,2.049,5.151,3.059,8.001,3.059c3.297,0,6.578-1.35,8.949-4
          c4.421-4.939,4-12.529-0.94-16.949l-44.275-39.619c-3.384-3.029-8.186-3.889-12.411-2.221l-21.385,8.439
          c-9.646-14.848-22.246-26.75-36.725-34.428l8.195-18.98l33.799,12.068c6.243,2.23,13.111-1.023,15.341-7.269
          c2.23-6.242-1.024-13.111-7.268-15.34l-44.395-15.851c-5.959-2.129-12.548,0.736-15.057,6.545l-13.262,30.713
          c-5.065-1.008-10.263-1.539-15.563-1.539s-10.499,0.531-15.564,1.539l-13.263-30.713c-2.508-5.811-9.099-8.674-15.058-6.545
          L68.73,40.115c-6.243,2.229-9.497,9.098-7.268,15.342c2.229,6.242,9.1,9.498,15.342,7.268l33.793-12.068l8.196,18.982
          c-14.477,7.678-27.076,19.58-36.723,34.424l-21.382-8.438c-4.223-1.666-9.026-0.809-12.41,2.221L4.001,137.465
          c-4.941,4.42-5.363,12.008-0.941,16.949c2.371,2.65,5.653,4,8.949,4c2.85,0,5.71-1.01,8-3.059l38.759-34.68l12.273,4.844
          c-5.955,15.047-9.292,31.897-9.292,49.691c0,9.299,0.917,18.336,2.636,26.996l-3.694-1.459c-4.225-1.666-9.026-0.807-12.41,2.221
          L4.001,242.584c-4.94,4.42-5.363,12.01-0.942,16.949c2.371,2.65,5.653,4,8.95,4c2.85,0,5.71-1.008,8-3.057l38.759-34.678
          l15.255,6.02c16.35,34.998,47.385,58.629,82.981,58.629c35.601,0,66.634-23.631,82.981-58.627l15.26-6.021l38.756,34.676
          c2.291,2.051,5.15,3.059,8,3.059c3.297,0,6.579-1.35,8.949-4C315.371,254.594,314.949,247.004,310.008,242.584z M119.239,138.14
          c0-8.586,6.967-15.553,15.563-15.553c8.593,0,15.559,6.967,15.559,15.553c0,8.588-6.966,15.551-15.559,15.551
          C126.206,153.691,119.239,146.728,119.239,138.14z M150.36,231.719c-8.595,0-15.559-6.973-15.559-15.557s6.964-15.547,15.559-15.547
          c8.585,0,15.552,6.963,15.552,15.547S158.945,231.719,150.36,231.719z M180.98,173.492c0-9.606,7.802-17.396,17.414-17.396
          c9.614,0,17.405,7.791,17.405,17.396c0,9.621-7.791,17.41-17.41-17.405C188.782,190.902,180.98,183.113,180.98,173.492z"/>
      </svg>
    ), 
    variant: 'destructive' 
  },
  epic: { 
    label: 'Epic', 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" className="h-3 w-3" viewBox="0 0 16 16">
        <path clipRule="evenodd" d="m10.271.050656c.2887.111871.479.38969.479.699344v4.63515l3.1471.62941c.2652.05303.4812.24469.5655.50161s.0238.53933-.1584.73914l-7.74997 8.49999c-.20863.2288-.53644.3059-.82517.194-.28874-.1118-.47905-.3896-.47905-.6993v-4.6351l-3.14708-.62947c-.26515-.05303-.48123-.24468-.56553-.5016-.08431-.25692-.02379-.53933.1584-.73915l7.75-8.499996c.20863-.2288201.53643-.305899.8252-.194028zm-6.57276 8.724134 3.05177.61036v3.92915l5.55179-6.08909-3.05179-.61036v-3.9291z" fill="#bf63f3" fillRule="evenodd" />
      </svg>
    ), 
    variant: 'outline',
    className: "bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:hover:bg-purple-900 dark:border-purple-800"
  },
  task: { 
    label: 'Task', 
    icon: (
      <svg className="h-3 w-3" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <path fill="#4A9EFF" fillRule="evenodd" d="M4,4 L9,4 C9.55228,4 10,3.55228 10,3 C10,2.44772 9.55228,2 9,2 L4,2 C2.89543,2 2,2.89543 2,4 L2,12 C2,13.1046 2.89543,14 4,14 L12,14 C13.1046,14 14,13.1046 14,12 L14,10 C14,9.44771 13.5523,9 13,9 C12.4477,9 12,9.44771 12,10 L12,12 L4,12 L4,4 Z M15.2071,2.29289 C14.8166,1.90237 14.1834,1.90237 13.7929,2.29289 L8.5,7.58579 L7.70711,6.79289 C7.31658,6.40237 6.68342,6.40237 6.29289,6.79289 C5.90237,7.18342 5.90237,7.81658 6.29289,8.20711 L7.79289,9.70711 C7.98043,9.89464 8.23478,10 8.5,10 C8.76522,10 9.01957,9.89464 9.20711,9.70711 L15.2071,3.70711 C15.5976,3.31658 15.5976,2.68342 15.2071,2.29289 Z"/>
      </svg>
    ), 
    variant: 'secondary' 
  },
  suggestion: { 
    label: 'Suggestion', 
    icon: (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3.6C3 3.26863 3.26863 3 3.6 3H20.4C20.7314 3 21 3.26863 21 3.6V17.4C21 17.7314 20.7314 18 20.4 18H16.2592C16.0938 18 15.9357 18.0683 15.8223 18.1888L12.4369 21.7858C12.2 22.0375 11.8 22.0375 11.5631 21.7858L8.17768 18.1888C8.06429 18.0683 7.90619 18 7.74076 18H3.6C3.26863 18 3 17.7314 3 17.4V3.6Z" stroke="#10B981" strokeWidth="1.5"/>
        <path d="M12 7L13.4254 9.57457L16 11L13.4254 12.4254L12 15L10.5746 12.4254L8 11L10.5746 9.57457L12 7Z" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ), 
    variant: 'outline' 
  },
};

export default function ProjectBugsPage() {
  const router = useRouter();
  const { projectId } = router.query;
  const { currentUser } = useUser();
  const { users } = useUsers();
  
  const [project, setProject] = useState<Project | null>(null);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    if (!projectId || typeof projectId !== 'string') return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const cursorToUse = overrideCursor !== undefined ? overrideCursor : cursorsRef.current[targetPage - 1];

      const [projectData, bugsData] = await Promise.all([
        project ? Promise.resolve(project) : projectApi.getById(projectId),
        bugApi.getPaginated(PAGE_SIZE, cursorToUse || undefined, {
          projectId: projectId,
          status: statusFilter,
          assignedTo: assigneeFilter,
          priority: priorityFilter,
          type: typeFilter,
          search: searchQuery
        })
      ]);
      
      if (!project) setProject(projectData);
      setBugs(bugsData.bugs);
      
      setPage(targetPage);
      
      if (bugsData.lastEvaluatedKey) {
        const nextCursor = JSON.stringify(bugsData.lastEvaluatedKey);
        setCursors(prev => {
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
      console.error('Failed to load project data:', err);
      setError('Failed to load project data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, statusFilter, assigneeFilter, priorityFilter, typeFilter, searchQuery, project]);

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
    // Navigate to bug creation with project pre-selected
    router.push(`/bugs/new?projectId=${projectId}`);
  };

  const handleBackToProjects = () => {
    router.push('/projects');
  };

  // With server-side pagination, bugs are already filtered
  const filteredBugs = bugs;

  // Calculate project statistics based on currently loaded bugs
  const getProjectStats = () => {
    const total = bugs.length;
    const open = bugs.filter(b => b.status === BugStatus.OPEN).length;
    const inProgress = bugs.filter(b => b.status === BugStatus.IN_PROGRESS).length;
    const resolved = bugs.filter(b => b.status === BugStatus.RESOLVED).length;
    const closed = bugs.filter(b => b.status === BugStatus.CLOSED).length;
    
    return { total, open, inProgress, resolved, closed };
  };

  // Define table columns with filter dropdowns
  const columns: ColumnDef<Bug>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Title" className="text-base" />
      ),
      cell: ({ row }) => <div className="font-medium text-foreground text-base">{row.getValue('title')}</div>,
    },
    {
      accessorKey: 'type',
      header: () => (
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 data-[state=open]:bg-accent text-base"
              >
                <span>Type</span>
                {typeFilter !== 'all' ? (
                  <Filter className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                All Types
              </DropdownMenuItem>
              {(['bug', 'epic', 'task', 'suggestion'] as BugType[]).map((type) => (
                <DropdownMenuItem key={type} onClick={() => setTypeFilter(type)}>
                  <Badge variant={BUG_TYPE_CONFIG[type].variant} className={`${BUG_TYPE_CONFIG[type].className || ''} mr-2 flex items-center gap-1`}>
                    {BUG_TYPE_CONFIG[type].icon}
                    {BUG_TYPE_CONFIG[type].label}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      cell: ({ row }) => {
        const type = row.getValue('type') as BugType;
        const config = BUG_TYPE_CONFIG[type] || BUG_TYPE_CONFIG.bug;
        return (
          <Badge variant={config.variant} className={`${config.className || ''} flex items-center gap-1 w-fit text-sm px-2 py-1`}>
            {config.icon}
            {config.label}
          </Badge>
        );
      },
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



  if (isLoading && !project) {
    return <LoadingState message="Loading project..." fullScreen />;
  }

  if (error || !project) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <ApiErrorFallback
            error={new Error(error || 'Project not found')}
            onRetry={() => loadData(1, null)}
            title="Failed to load project"
          />
        </div>
      </div>
    );
  }

  const stats = getProjectStats();

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleBackToProjects}>
            ← Back to Projects
          </Button>
        </div>

        {/* Project context card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl">{project.name}</CardTitle>
                <p className="text-muted-foreground mt-2">{project.description}</p>
              </div>
              {currentUser && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/sprints`)}>
                    View Sprints
                  </Button>
                  <Button onClick={handleCreateBug}>
                    Create Bug
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-destructive">{stats.open}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.resolved}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Closed</p>
                <p className="text-2xl font-bold text-green-600">{stats.closed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Header with view toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Project Bugs</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Manage bugs for this project
            </p>
          </div>
        </div>

        {/* Search filter */}
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

          {/* Bug table */}
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
