import useSWR from 'swr';
import { useState, useEffect, useCallback } from 'react';
import { userApi, projectApi, sprintApi, activityLogApi, bugApi } from '@/utils/apiClient';
import { User, Project, ActivityLog, Bug } from '@/utils/types';
import { Sprint } from '@/lib/models/sprint';

/**
 * Hook to fetch all users with caching
 */
export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR<User[]>('/api/users', () => userApi.getAll(), {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  });
  
  return {
    users: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook to fetch all projects with caching
 */
export function useProjects() {
  const { data, error, isLoading, mutate } = useSWR<Project[]>('/api/projects', () => projectApi.getAll(), {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  });

  return {
    projects: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook to fetch a single project by ID
 */
export function useProject(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Project>(
    id ? `/api/projects/${id}` : null,
    () => id ? projectApi.getById(id) as Promise<Project> : Promise.reject('No ID'),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    project: data,
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook to fetch all bugs without caching
 */
export function useBugs() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const fetchBugs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await bugApi.getAll();
      setBugs(data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBugs();
  }, [fetchBugs]);

  return {
    bugs,
    isLoading,
    isError: error,
    mutate: fetchBugs
  };
}

/**
 * Hook to fetch sprints for a project with caching
 */
export function useSprints(projectId: string | 'all') {
  const shouldFetch = projectId && projectId !== 'all';
  
  const { data, error, isLoading, mutate } = useSWR<Sprint[]>(
    shouldFetch ? `/api/projects/${projectId}/sprints` : null,
    () => sprintApi.getByProject(projectId),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    sprints: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook to fetch all sprints with caching
 */
export function useAllSprints() {
  const { data, error, isLoading, mutate } = useSWR<Sprint[]>('/api/sprints', () => sprintApi.getAll(), {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  });

  return {
    sprints: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook to fetch all activity logs without caching
 */
export function useActivityLogs() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await activityLogApi.getAll();
      setActivityLogs(data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    activityLogs,
    isLoading,
    isError: error,
    mutate: fetchLogs
  };
}
