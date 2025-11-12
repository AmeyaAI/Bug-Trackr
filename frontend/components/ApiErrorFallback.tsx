/**
 * API Error Fallback Component
 * 
 * Fallback UI for API communication errors with retry mechanisms.
 * Provides user-friendly error messages and recovery options.
 * 
 * Requirements: 6.4
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';

interface ApiErrorFallbackProps {
  error?: Error | string;
  onRetry?: () => void;
  title?: string;
  message?: string;
  showRetry?: boolean;
}

export const ApiErrorFallback: React.FC<ApiErrorFallbackProps> = ({
  error,
  onRetry,
  title = 'Unable to load data',
  message,
  showRetry = true,
}) => {
  const errorMessage = message || (typeof error === 'string' ? error : error?.message) || 'An unexpected error occurred';
  
  const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                         errorMessage.toLowerCase().includes('connection');

  return (
    <div className="flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            {isNetworkError ? (
              <WifiOff className="size-6 text-destructive" />
            ) : (
              <AlertCircle className="size-6 text-destructive" />
            )}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
          
          {isNetworkError && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">
                Please check your internet connection and try again.
              </p>
            </div>
          )}
        </CardContent>

        {showRetry && onRetry && (
          <CardFooter>
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="size-4 mr-2" />
              Try Again
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

interface RetryableErrorProps {
  error: Error | string;
  onRetry: () => void;
  retryCount?: number;
  maxRetries?: number;
}

export const RetryableError: React.FC<RetryableErrorProps> = ({
  error,
  onRetry,
  retryCount = 0,
  maxRetries = 3,
}) => {
  const canRetry = retryCount < maxRetries;
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4">
      <div className="text-center space-y-2">
        <AlertCircle className="size-12 text-destructive mx-auto" />
        <h3 className="text-lg font-semibold">Something went wrong</h3>
        <p className="text-sm text-muted-foreground max-w-md">{errorMessage}</p>
      </div>

      {canRetry ? (
        <div className="flex flex-col items-center gap-2">
          <Button onClick={onRetry}>
            <RefreshCw className="size-4 mr-2" />
            Retry ({maxRetries - retryCount} attempts remaining)
          </Button>
          <p className="text-xs text-muted-foreground">
            Attempt {retryCount + 1} of {maxRetries}
          </p>
        </div>
      ) : (
        <div className="text-center space-y-2">
          <p className="text-sm text-destructive font-medium">
            Maximum retry attempts reached
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Reload Page
          </Button>
        </div>
      )}
    </div>
  );
};
