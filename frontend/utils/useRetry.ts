/**
 * useRetry Hook
 * 
 * Custom hook for handling retry logic with exponential backoff.
 * Provides automatic retry mechanisms for failed API requests.
 * 
 * Requirements: 6.4
 */

import { useState, useCallback } from 'react';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number) => void;
  onMaxRetriesReached?: () => void;
}

interface RetryState {
  retryCount: number;
  isRetrying: boolean;
  error: Error | null;
}

export const useRetry = (options: RetryOptions = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const [state, setState] = useState<RetryState>({
    retryCount: 0,
    isRetrying: false,
    error: null,
  });

  const calculateDelay = useCallback(
    (attempt: number): number => {
      const delay = initialDelay * Math.pow(backoffMultiplier, attempt);
      return Math.min(delay, maxDelay);
    },
    [initialDelay, backoffMultiplier, maxDelay]
  );

  const executeWithRetry = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          setState((prev) => ({
            ...prev,
            retryCount: attempt,
            isRetrying: attempt > 0,
          }));

          if (attempt > 0) {
            onRetry?.(attempt);
            const delay = calculateDelay(attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          const result = await fn();

          setState({
            retryCount: 0,
            isRetrying: false,
            error: null,
          });

          return result;
        } catch (error) {
          lastError = error as Error;
          console.error(`Attempt ${attempt + 1} failed:`, error);

          if (attempt === maxRetries) {
            onMaxRetriesReached?.();
            setState({
              retryCount: attempt,
              isRetrying: false,
              error: lastError,
            });
            throw lastError;
          }
        }
      }

      throw lastError;
    },
    [maxRetries, calculateDelay, onRetry, onMaxRetriesReached]
  );

  const reset = useCallback(() => {
    setState({
      retryCount: 0,
      isRetrying: false,
      error: null,
    });
  }, []);

  return {
    executeWithRetry,
    reset,
    retryCount: state.retryCount,
    isRetrying: state.isRetrying,
    error: state.error,
    canRetry: state.retryCount < maxRetries,
  };
};

/**
 * Retry a function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempt - 1),
          maxDelay
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.error(`Retry attempt ${attempt + 1} failed:`, error);

      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }

  throw lastError!;
};
