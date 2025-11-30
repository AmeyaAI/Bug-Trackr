/**
 * API Helper Utilities
 * 
 * Helper functions for handling API operations with retry logic
 * and eventual consistency handling.
 * 
 * Requirements: 6.4
 */

import { AxiosError } from 'axios';
import { FilterQuery } from '../lib/services/collectionDb';

/**
 * Constructs server-side filter array from UI filter state
 */
export const constructBugFilters = (filters: {
  projectId?: string;
  status?: string;
  assignedTo?: string;
  priority?: string;
  severity?: string;
  type?: string;
  search?: string;
  sprintId?: string | null;
}): FilterQuery[] => {
  const dbFilters: FilterQuery[] = [];

  // Check if we are filtering by a specific sprint (not backlog)
  // If so, we don't need to filter by project ID as sprint ID is unique
  const isSpecificSprint = filters.sprintId && filters.sprintId !== 'all' && filters.sprintId !== 'backlog';

  if (filters.projectId && filters.projectId !== 'all' && !isSpecificSprint) {
    dbFilters.push({
      field_name: 'payload.project_id',
      field_value: filters.projectId,
      operator: 'like',
    });
  }

  if (filters.sprintId !== undefined && filters.sprintId !== 'all') {
    if (filters.sprintId === 'backlog') {
      dbFilters.push({
        field_name: 'payload.sprint_id',
        field_value: [],
        operator: 'eq',
      });
    } else {
      dbFilters.push({
        field_name: 'payload.sprint_id',
        field_value: filters.sprintId,
        operator: 'like',
      });
    }
  }

  if (filters.status && filters.status !== 'all') {
    dbFilters.push({
      field_name: 'payload.status',
      field_value: filters.status,
      operator: 'eq',
    });
  }

  if (filters.assignedTo && filters.assignedTo !== 'all') {
      if (filters.assignedTo === 'unassigned') {
          dbFilters.push({
              field_name: 'payload.assigned_to',
              field_value: null,
              operator: 'eq',
          });
      } else {
          dbFilters.push({
              field_name: 'payload.assigned_to',
              field_value: filters.assignedTo,
              operator: 'eq',
          });
      }
  }

  if (filters.priority && filters.priority !== 'all') {
    dbFilters.push({
      field_name: 'payload.priority',
      field_value: filters.priority,
      operator: 'eq',
    });
  }

  if (filters.severity && filters.severity !== 'all') {
    dbFilters.push({
      field_name: 'payload.severity',
      field_value: filters.severity,
      operator: 'eq',
    });
  }

  if (filters.type && filters.type !== 'all') {
    dbFilters.push({
      field_name: 'payload.type',
      field_value: filters.type,
      operator: 'eq',
    });
  }

  if (filters.search) {
    dbFilters.push({
      field_name: 'payload.title',
      field_value: filters.search,
      operator: 'eq',
    });
  }
  
  return dbFilters;
};

/**
 * Retry an async operation with delay between attempts
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    onRetry?: (attempt: number) => void;
  } = {}
): Promise<T> => {
  const { maxRetries = 2, delayMs = 1000, onRetry } = options;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        onRetry?.(attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx) except 404 which might be eventual consistency
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        
        if (status && status >= 400 && status < 500 && status !== 404) {
          throw error;
        }
      }
      
      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }
  
  throw lastError;
};

/**
 * Handle eventual consistency issues by retrying the fetch after an update
 */
export const handleEventualConsistency = async <T>(
  updateOperation: () => Promise<unknown>,
  fetchOperation: () => Promise<T>,
  options: {
    showOptimisticUpdate?: boolean;
    onOptimisticUpdate?: () => void;
  } = {}
): Promise<T> => {
  const { showOptimisticUpdate = false, onOptimisticUpdate } = options;
  
  try {
    // Perform the update
    await updateOperation();
    
    // Show optimistic update if requested
    if (showOptimisticUpdate && onOptimisticUpdate) {
      onOptimisticUpdate();
    }
    
    // Retry fetch with delay to handle eventual consistency
    return await retryOperation(fetchOperation, {
      maxRetries: 3,
      delayMs: 500,
    });
  } catch (error) {
    // If update succeeded but fetch failed, still try to fetch
    // This handles the case where update returns 500 but actually succeeded
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return await fetchOperation();
    } catch {
      throw error; // Throw original error
    }
  }
};
