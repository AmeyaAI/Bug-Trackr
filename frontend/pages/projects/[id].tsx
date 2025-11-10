/**
 * Project-Specific Bug Page
 * 
 * Filters bugs by selected project and displays project context information.
 * Maintains all bug management functionality within project scope.
 * 
 * Requirements: 5.2, 5.5
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { BugCard } from '@/components/BugCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { bugApi, projectApi, userApi, commentApi } from '@/utils/apiClient';
import { Bug, BugStatus, BugPriority, Project, User } from '@/utils/types';
import { useUser } from '@/contexts/UserContext';

export default function ProjectBugsPage() {
  const router = useRouter();
  const { id: projectId } = router.query;
  const { currentUser } = useUser();
  
  const [project, setProject] = useState<Project | null>(null);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (projectId && typeof projectId === 'string') {
      loadData(projectId);
    }
  }, [projectId]);

  const loadData = async (projId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [projectData, allBugs, usersData] = await Promise.all([
        projectApi.getById(projId),
        bugApi.getAll(),
        userApi.getAll(),
      ]);
      
      setProject(projectData);
      // Filter bugs for this project
      const projectBugs = allBugs.filter(bug => bug.projectId === projId);
      setBugs(projectBugs);
      setUsers(usersData);
      
      // Load comment counts for each bug
      const counts: Record<string, number> = {};
      await Promise.all(
        projectBugs.map(async (bug) => {
          try {
            const comments = await commentApi.getByBugId(bug._id);
            counts[bug._id] = comments.length;
          } catch (err) {
            counts[bug._id] = 0;
          }
        })
      );
      setCommentCounts(counts);
    } catch (err) {
      console.error('Failed to load project data:', err);
      setError('Failed to load project data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (bugId: string, newStatus: BugStatus) => {
    if (!currentUser) {
      alert('Please select a user first');
      return;
    }

    try {
      await bugApi.updateStatus(bugId, {
        status: newStatus,
        userId: currentUser._id,
        userRole: currentUser.role as any,
      });
      
      // Reload bugs to reflect changes
      if (projectId && typeof projectId === 'string') {
        await loadData(projectId);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update bug status');
    }
  };

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

  // Get user name by ID
  const getUserName = (userId: string): string => {
    const user = users.find(u => u._id === userId);
    return user?.name || 'Unknown User';
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

  // Calculate project statistics
  const getProjectStats = () => {
    const total = bugs.length;
    const open = bugs.filter(b => b.status === BugStatus.OPEN).length;
    const inProgress = bugs.filter(b => b.status === BugStatus.IN_PROGRESS).length;
    const resolved = bugs.filter(b => b.status === BugStatus.RESOLVED).length;
    const closed = bugs.filter(b => b.status === BugStatus.CLOSED).length;
    const critical = bugs.filter(b => b.priority === BugPriority.CRITICAL).length;
    
    return { total, open, inProgress, resolved, closed, critical };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-destructive">{error || 'Project not found'}</p>
            <div className="flex gap-2">
              <Button onClick={() => projectId && typeof projectId === 'string' && loadData(projectId)}>
                Retry
              </Button>
              <Button variant="outline" onClick={handleBackToProjects}>
                Back to Projects
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = getProjectStats();

  return (
    <div className="min-h-screen bg-background p-8">
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
              <Button onClick={handleCreateBug}>
                Create Bug
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <SelectItem value={BugPriority.CRITICAL}>{BugPriority.CRITICAL}</SelectItem>
              <SelectItem value={BugPriority.HIGH}>{BugPriority.HIGH}</SelectItem>
              <SelectItem value={BugPriority.MEDIUM}>{BugPriority.MEDIUM}</SelectItem>
              <SelectItem value={BugPriority.LOW}>{BugPriority.LOW}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredBugs.length} of {bugs.length} bugs in this project
        </div>

        {/* Bug list */}
        {filteredBugs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-muted-foreground">
              {bugs.length === 0 ? 'No bugs in this project yet' : 'No bugs match your filters'}
            </p>
            <Button variant="outline" onClick={handleCreateBug}>
              Create First Bug
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBugs.map((bug) => (
              <BugCard
                key={bug._id}
                bug={bug}
                commentCount={commentCounts[bug._id] || 0}
                assignedUserName={bug.assignedTo ? getUserName(bug.assignedTo) : undefined}
                onStatusUpdate={handleStatusUpdate}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
