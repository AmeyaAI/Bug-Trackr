/**
 * Project List Page
 * 
 * Displays all projects from Collection DB with project information.
 * Provides navigation to project-specific bug views.
 * 
 * Requirements: 5.1, 5.3
 */

import React, { useEffect, useState } from 'react';
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
import { projectApi, bugApi } from '@/utils/apiClient';
import { Project, Bug } from '@/utils/types';

export default function ProjectsPage() {
  const router = useRouter();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [projectsData, bugsData] = await Promise.all([
        projectApi.getAll(),
        bugApi.getAll(),
      ]);
      
      setProjects(projectsData);
      setBugs(bugsData);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProject = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  // Get bug count for a project
  const getBugCount = (projectId: string): number => {
    return bugs.filter(bug => bug.projectId === projectId).length;
  };

  // Get open bug count for a project
  const getOpenBugCount = (projectId: string): number => {
    return bugs.filter(bug => bug.projectId === projectId && bug.status === 'Open').length;
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
            <Button onClick={loadData}>Retry</Button>
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
          <Button onClick={() => router.push('/bugs')}>
            View All Bugs
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
                    </div>
                  </CardContent>

                  <CardFooter>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleViewProject(project.id)}
                    >
                      View Bugs
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
