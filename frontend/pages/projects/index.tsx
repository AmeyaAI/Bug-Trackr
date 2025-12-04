/**
 * Project List Page
 * 
 * Displays all projects from Collection DB with project information.
 * Provides navigation to project-specific bug views.
 * 
 * Requirements: 5.1, 5.3
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useProjects, useBugs, useAllSprints } from '@/lib/hooks/useData';

export default function ProjectsPage() {
  const router = useRouter();

  const { projects, isLoading: isLoadingProjects, isError: projectsError } = useProjects();
  const { bugs, isLoading: isLoadingBugs, isError: bugsError } = useBugs();
  const { sprints, isLoading: isLoadingSprints, isError: sprintsError } = useAllSprints();
  const [searchQuery, setSearchQuery] = useState('');  const isLoading = isLoadingProjects || isLoadingBugs || isLoadingSprints;
  const error = projectsError || bugsError || sprintsError ? 'Failed to load data' : null;

  const handleViewProject = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const handleViewSprints = (projectId: string) => {
    router.push(`/projects/${projectId}/sprints`);
  };

  // Get bug count for a project
  const getBugCount = (projectId: string): number => {
    return bugs.filter(bug => bug.projectId === projectId).length;
  };

  // Get open bug count for a project
  const getOpenBugCount = (projectId: string): number => {
    return bugs.filter(bug => bug.projectId === projectId && bug.status === 'Open').length;
  };

  // Get sprint count for a project
  const getSprintCount = (projectId: string): number => {
    return sprints.filter(sprint => sprint.projectId === projectId).length;
  };

  // Filter projects based on search query
  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchQuery === '' || 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
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
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">
              View and manage bugs organized by project
            </p>
          </div>
          <Button onClick={() => router.push('/projects/new')}>
            Create Project
          </Button>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sm:max-w-xs"
          />
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredProjects.length} of {projects.length} projects
        </div>

        {/* Project list */}
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-muted-foreground">No projects found</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const totalBugs = getBugCount(project.id);
              const openBugs = getOpenBugCount(project.id);
              const totalSprints = getSprintCount(project.id);
              
              return (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {project.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Bugs:</span>
                        <span className="font-medium">{totalBugs}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Open Bugs:</span>
                        <span className="font-medium text-destructive">{openBugs}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Resolved:</span>
                        <span className="font-medium text-green-600">
                          {totalBugs - openBugs}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Sprints:</span>
                        <span className="font-medium">{totalSprints}</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleViewProject(project.id)}
                    >
                      View Bugs
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleViewSprints(project.id)}
                    >
                      View Sprints
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
