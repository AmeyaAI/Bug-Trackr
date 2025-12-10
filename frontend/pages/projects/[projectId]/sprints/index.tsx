import React from 'react';
import { useRouter } from 'next/router';
import { useProject, useSprints } from '@/lib/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Target, ArrowRight, Clock, CheckCircle2, CircleDashed, MoreVertical, PlayCircle, CheckSquare, CalendarClock } from 'lucide-react';
import { CreateSprintDialog } from '@/components/SprintManagement/CreateSprintDialog';
import { Sprint, SprintStatus } from '@/lib/models/sprint';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sprintApi } from '@/utils/apiClient';
import { useToast } from '@/contexts/ToastContext';

const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
};

const formatDateYear = (date: Date | string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
};

export default function ProjectSprintsPage() {
  const router = useRouter();
  const { projectId } = router.query;
  const { project, isLoading: isLoadingProject } = useProject(projectId as string);
  const { sprints, isLoading: isLoadingSprints, mutate } = useSprints(projectId as string);
  const { showToast } = useToast();

  const isLoading = isLoadingProject || isLoadingSprints;

  const handleSprintClick = (sprintId: string) => {
    router.push(`/projects/${projectId}/sprints/${sprintId}`);
  };

  const handleStatusUpdate = async (e: React.MouseEvent, sprintId: string, newStatus: SprintStatus) => {
    e.stopPropagation(); // Prevent card click
    
    // Optimistic update
    const previousSprints = sprints;
    const optimisticSprints = sprints.map(s => 
      s.id === sprintId ? { ...s, status: newStatus } : s
    );

    // Update UI immediately
    mutate(optimisticSprints, false);
    showToast('success', `Sprint marked as ${newStatus}`);

    try {
      await sprintApi.update(sprintId, { status: newStatus });
      // Trigger revalidation to ensure data consistency
      mutate();
    } catch (error) {
      console.error('Failed to update sprint status:', error);
      showToast('error', 'Failed to update sprint status');
      // Rollback to previous state
      mutate(previousSprints, false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-emerald-500',
          badge: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200',
          icon: <Clock className="h-4 w-4 mr-1" />,
          label: 'Active Sprint'
        };
      case 'completed':
        return {
          color: 'bg-blue-500',
          badge: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200',
          icon: <CheckCircle2 className="h-4 w-4 mr-1" />,
          label: 'Completed'
        };
      default:
        return {
          color: 'bg-slate-500',
          badge: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200',
          icon: <CircleDashed className="h-4 w-4 mr-1" />,
          label: 'Planned'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900">Project not found</h2>
          <Button variant="link" onClick={() => router.push('/projects')}>Return to Projects</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white dark:bg-card p-6 rounded-xl shadow-sm border border-slate-100 dark:border-border">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span className="cursor-pointer hover:text-primary" onClick={() => router.push('/projects')}>Projects</span>
              <span>/</span>
              <span className="cursor-pointer hover:text-primary" onClick={() => router.push(`/projects/${projectId}`)}>{project.name}</span>
              <span>/</span>
              <span className="font-medium text-foreground">Sprints</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-foreground">Sprint Board</h1>
            <p className="text-slate-500 dark:text-muted-foreground mt-1">
              Manage and track development cycles for <span className="font-medium text-slate-700 dark:text-foreground">{project.name}</span>
            </p>
          </div>
          <CreateSprintDialog 
            projectId={projectId as string}
            onSprintCreated={() => mutate()}
          />
        </div>

        {/* Sprints Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sprints.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white dark:bg-card rounded-xl border border-dashed border-slate-300 dark:border-border">
              <div className="h-16 w-16 bg-slate-50 dark:bg-muted rounded-full flex items-center justify-center mb-4">
                <Target className="h-8 w-8 text-slate-400 dark:text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-foreground">No sprints yet</h3>
              <p className="text-slate-500 dark:text-muted-foreground max-w-sm text-center mt-2 mb-6">
                Create your first sprint to start tracking work items and managing your development cycle.
              </p>
              <CreateSprintDialog 
                projectId={projectId as string}
                onSprintCreated={() => mutate()}
              />
            </div>
          ) : (
            sprints.map((sprint: Sprint) => {
              const statusConfig = getStatusConfig(sprint.status);
              
              return (
                <Card 
                  key={sprint.id} 
                  className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-slate-200 dark:border-border overflow-hidden bg-white dark:bg-card relative"
                  onClick={() => handleSprintClick(sprint.id)}
                >
                  {/* Status Bar */}
                  <div className={cn("h-1.5 w-full", statusConfig.color)} />
                  
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <CardTitle className="text-xl font-bold text-slate-900 dark:text-foreground group-hover:text-primary transition-colors">
                          {sprint.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-500 dark:text-muted-foreground">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{formatDate(sprint.startDate)} - {formatDateYear(sprint.endDate)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("shrink-0 flex items-center px-2.5 py-0.5 text-xs font-semibold transition-colors", statusConfig.badge)}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </Badge>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 -mr-2 text-slate-400 hover:text-slate-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => handleStatusUpdate(e, sprint.id, 'planned')}
                              disabled={sprint.status === 'planned'}
                            >
                              <CalendarClock className="mr-2 h-4 w-4" />
                              Mark as Planned
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => handleStatusUpdate(e, sprint.id, 'active')}
                              disabled={sprint.status === 'active'}
                            >
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Start Sprint
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => handleStatusUpdate(e, sprint.id, 'completed')}
                              disabled={sprint.status === 'completed'}
                            >
                              <CheckSquare className="mr-2 h-4 w-4" />
                              Complete Sprint
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-3">
                    <div className="space-y-4">
                      {/* Goal Section */}
                      <div className="bg-slate-50 dark:bg-muted rounded-lg p-3 border border-slate-100 dark:border-border">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-1.5">
                          <Target className="h-3.5 w-3.5" />
                          Sprint Goal
                        </div>
                        <p className="text-sm text-slate-700 dark:text-foreground leading-relaxed">
                          {sprint.goal || "No goal set for this sprint."}
                        </p>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-3 border-t border-slate-50 dark:border-border bg-slate-50/30 dark:bg-muted/30">
                    <Button variant="ghost" className="w-full justify-between text-slate-600 dark:text-muted-foreground hover:text-primary hover:bg-primary/5 group-hover:font-medium">
                      Open Board
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
