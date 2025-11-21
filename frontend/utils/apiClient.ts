/**
 * Axios API client configuration for BugTrackr backend
 * Handles request/response transformation, error handling, and interceptors
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import type {
  Bug,
  Comment,
  Project,
  User,
  ActivityLog,
  BugCreateRequest,
  BugStatusUpdateRequest,
  BugAssignRequest,
  CommentCreateRequest,
  ProjectCreateRequest,
  BugWithCommentsResponse,
  StatusUpdateResponse,
  AssignmentResponse,
  BugResponse,
  CommentResponse,
  ProjectResponse,
} from './types';

// Track request count for loading state
let activeRequests = 0;
const requestListeners: Array<(count: number) => void> = [];

export const subscribeToRequestCount = (listener: (count: number) => void) => {
  requestListeners.push(listener);
  return () => {
    const index = requestListeners.indexOf(listener);
    if (index > -1) {
      requestListeners.splice(index, 1);
    }
  };
};

const notifyRequestListeners = () => {
  requestListeners.forEach(listener => listener(activeRequests));
};

// API configuration - using relative paths for Next.js API routes
// No baseURL needed since we're using relative paths (/api/*)
const apiClient: AxiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Track active requests
    activeRequests++;
    notifyRequestListeners();
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error: AxiosError) => {
    activeRequests--;
    notifyRequestListeners();
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Track active requests
    activeRequests--;
    notifyRequestListeners();
    
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
    }
    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    // Track active requests
    activeRequests--;
    notifyRequestListeners();
    
    // Handle errors
    const errorMessage = handleApiError(error);
    console.error('[API Response Error]', errorMessage);
    return Promise.reject(error);
  }
);

/**
 * API Error Response structure (Next.js API routes format)
 */
export interface ApiErrorResponse {
  error?: string;           // Human-readable error message
  details?: unknown;        // Optional additional context (e.g., Zod validation errors)
  code?: string;            // Optional error code for client handling
}

/**
 * Handle API errors and return user-friendly messages
 */
export const handleApiError = (error: AxiosError<ApiErrorResponse>): string => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const data = error.response.data;
    
    // Try to extract error message from new format first
    if (data?.error) {
      return data.error;
    }
    
    // Fallback to status-based messages
    switch (status) {
      case 400:
        // Check if details contains Zod validation errors
        if (data?.details && Array.isArray(data.details)) {
          return data.details.map((err: unknown) => {
            if (typeof err === 'object' && err !== null) {
              const errObj = err as Record<string, unknown>;
              return errObj.message || JSON.stringify(err);
            }
            return String(err);
          }).join(', ');
        }
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Unauthorized. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'Resource not found.';
      case 405:
        return 'Method not allowed.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return `Error: ${status}`;
    }
  } else if (error.request) {
    // Request made but no response
    return 'Network error. Please check your connection.';
  } else {
    // Error setting up request
    return error.message || 'An unexpected error occurred.';
  }
};

/**
 * Transform backend date strings to Date objects
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformDates = <T extends Record<string, any>>(data: T): T => {
  const dateFields = ['createdAt', 'updatedAt', 'timestamp'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformed = { ...data } as Record<string, any>;

  dateFields.forEach(field => {
    if (transformed[field] && typeof transformed[field] === 'string') {
      transformed[field] = new Date(transformed[field]);
    }
  });
  return transformed as T;
};

// Bug API endpoints
export const bugApi = {
  /**
   * Get all bugs
   */
  getAll: async (): Promise<Bug[]> => {
    const response = await apiClient.get<Bug[]>('/api/bugs');
    return response.data.map(transformDates);
  },

  /**
   * Get bug by ID with comments
   */
  getById: async (id: string): Promise<BugWithCommentsResponse> => {
    const response = await apiClient.get<BugWithCommentsResponse>(`/api/bugs/${id}`);
    return {
      bug: transformDates(response.data.bug),
      comments: response.data.comments.map(transformDates),
    };
  },

  /**
   * Create new bug
   */
  create: async (data: BugCreateRequest): Promise<BugResponse> => {
    // Next.js API routes expect JSON
    const response = await apiClient.post<BugResponse>('/api/bugs', data);
    return transformDates(response.data);
  },

  /**
   * Update bug status
   */
  updateStatus: async (id: string, data: BugStatusUpdateRequest): Promise<StatusUpdateResponse> => {
    const response = await apiClient.patch<StatusUpdateResponse>(`/api/bugs/${id}/status`, data);
    if (response.data.bug) {
      response.data.bug = transformDates(response.data.bug);
    }
    return response.data;
  },

  /**
   * Validate bug (tester only)
   */
  validate: async (id: string, userId: string, userRole: string = 'tester'): Promise<StatusUpdateResponse> => {
    const response = await apiClient.patch<StatusUpdateResponse>(`/api/bugs/${id}/validate`, {
      userId,
      userRole,
    });
    if (response.data.bug) {
      response.data.bug = transformDates(response.data.bug);
    }
    return response.data;
  },


  /**
   * Assign bug to user
   */
  assign: async (id: string, data: BugAssignRequest): Promise<AssignmentResponse> => {
    const response = await apiClient.patch<AssignmentResponse>(`/api/bugs/${id}/assign`, data);
    if (response.data.bug) {
      response.data.bug = transformDates(response.data.bug);
    }
    return response.data;
  },
};

// Comment API endpoints
export const commentApi = {
  /**
   * Create new comment
   */
  create: async (data: CommentCreateRequest): Promise<CommentResponse> => {
    const response = await apiClient.post<CommentResponse>('/api/comments', data);
    return transformDates(response.data);
  },

  /**
   * Get comments for a bug
   */
  getByBugId: async (bugId: string): Promise<Comment[]> => {
    const response = await apiClient.get<Comment[]>('/api/comments', {
      params: { bugId },
    });
    return response.data.map(transformDates);
  },
};

// Project API endpoints
export const projectApi = {
  /**
   * Get all projects
   */
  getAll: async (): Promise<Project[]> => {
    const response = await apiClient.get<Project[]>('/api/projects');
    return response.data.map(transformDates);
  },

  /**
   * Create new project
   */
  create: async (data: ProjectCreateRequest): Promise<ProjectResponse> => {
    const response = await apiClient.post<ProjectResponse>('/api/projects', data);
    return transformDates(response.data);
  },

  /**
   * Get project by ID
   */
  getById: async (id: string): Promise<ProjectResponse> => {
    const response = await apiClient.get<ProjectResponse>(`/api/projects/${id}`);
    return transformDates(response.data);
  },
};

// User API endpoints
export const userApi = {
  /**
   * Get all users
   */
  getAll: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/api/users');
    return response.data.map(transformDates);
  },

  /**
   * Get user by ID
   */
  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<User>(`/api/users/${id}`);
    return transformDates(response.data);
  },
};

// Activity Log API endpoints
export const activityLogApi = {
  /**
   * Get all activity logs
   */
  getAll: async (): Promise<ActivityLog[]> => {
    const response = await apiClient.get<ActivityLog[]>('/api/activities');
    return response.data.map(transformDates);
  },

  /**
   * Get activity logs for a specific bug
   */
  getByBugId: async (bugId: string): Promise<ActivityLog[]> => {
    const response = await apiClient.get<ActivityLog[]>('/api/activities', {
      params: { bugId },
    });
    return response.data.map(transformDates);
  },
};

// Export configured client for custom requests
export default apiClient;
