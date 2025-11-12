/**
 * API Helper Utilities
 * 
 * Helper functions for handling API operations with retry logic
 * and eventual consistency handling.
 * 
 * Requirements: 6.4
 */

import { AxiosError } from 'axios';

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
    } catch (fetchError) {
      throw error; // Throw original error
    }
  }
};
