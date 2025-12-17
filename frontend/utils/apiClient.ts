/**
 * Client-side API client for BugTrackr
 * Directly uses repositories via ServiceContainer instead of HTTP API routes
 */

import { getServiceContainer } from '../lib/services/serviceContainer';
import { Sprint, CreateSprintInput } from '../lib/models/sprint';
import { BugTag, BugStatus, BugPriority, BugSeverity, BugType } from '../lib/models/bug';
import { Activity, ActivityAction } from '../lib/models/activity';
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

/**
 * Wraps a promise to track active requests for loading indicators
 */
const trackRequest = async <T>(promise: Promise<T>): Promise<T> => {
  activeRequests++;
  notifyRequestListeners();
  try {
    const result = await promise;
    return result;
  } catch (error) {
    console.error('[API Request Error]', error);
    throw error;
  } finally {
    activeRequests--;
    notifyRequestListeners();
  }
};

/**
 * Handle API errors and return user-friendly messages
 */
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
};

/**
 * Helper to enrich Activity with related data to match ActivityLog interface
 */
const enrichActivity = async (activity: Activity): Promise<ActivityLog> => {
  const services = getServiceContainer();
  
  const [bug, user] = await Promise.all([
    activity.bugId ? services.getBugRepository().getById(activity.bugId) : Promise.resolve(null),
    activity.authorId ? services.getUserRepository().getById(activity.authorId) : Promise.resolve(null)
  ]);

  let project = null;
  if (bug) {
    project = await services.getProjectRepository().getById(bug.projectId);
  }

  let assignedToName: string | undefined;
  if (activity.assignedToId) {
    const assignedUser = await services.getUserRepository().getById(activity.assignedToId);
    assignedToName = assignedUser?.name;
  }

  return {
    id: activity.id,
    bugId: activity.bugId || '',
    bugTitle: bug?.title || 'Unknown Bug',
    projectId: project?.id || 'unknown',
    projectName: project?.name || 'Unknown Project',
    action: activity.action,
    performedBy: activity.authorId,
    performedByName: user?.name || 'Unknown User',
    newStatus: activity.newStatus,
    assignedToName,
    timestamp: activity.timestamp,
  };
};

// Bug API endpoints
export const bugApi = {
  getAll: async (): Promise<Bug[]> => {
    const services = getServiceContainer();
    return trackRequest(services.getBugRepository().getAll());
  },

  getPaginated: async (
    pageSize: number, 
    lastEvaluatedKey?: string,
    filters?: {
      projectId?: string;
      status?: string;
      assignedTo?: string;
      priority?: string;
      severity?: string;
      type?: string;
      search?: string;
      sprintId?: string | null;
    }
  ): Promise<{ bugs: Bug[], lastEvaluatedKey: Record<string, unknown> | null }> => {
    const services = getServiceContainer();
    const repo = services.getBugRepository();

    if (filters) {
        return trackRequest(repo.search({
            projectId: filters.projectId,
            status: filters.status as BugStatus,
            assignedTo: filters.assignedTo,
            priority: filters.priority as BugPriority,
            severity: filters.severity as BugSeverity,
            type: filters.type as BugType,
            searchQuery: filters.search,
            sprintId: filters.sprintId
        }, pageSize, lastEvaluatedKey));
    }

    return trackRequest(repo.getAllPaginated(pageSize, lastEvaluatedKey));
  },

  getById: async (id: string): Promise<BugWithCommentsResponse> => {
    const services = getServiceContainer();
    const bugRepo = services.getBugRepository();
    const commentRepo = services.getCommentRepository();

    const bugPromise = bugRepo.getById(id);
    const commentsPromise = commentRepo.getByBug(id);

    const [bug, comments] = await trackRequest(Promise.all([bugPromise, commentsPromise]));

    if (!bug) {
      throw new Error('Bug not found');
    }

    return {
      bug,
      comments,
    };
  },

  create: async (data: BugCreateRequest): Promise<BugResponse> => {
    const services = getServiceContainer();
    const createInput = {
        ...data,
        status: BugStatus.OPEN,
        validated: false,
        assignedTo: null,
        attachments: ''
    };
    const bug = await trackRequest(services.getBugRepository().create(createInput));

    // Log activity
    await services.getActivityRepository().create({
      bugId: bug.id,
      action: ActivityAction.REPORTED,
      authorId: data.reportedBy,
    });

    return bug;
  },

  updateStatus: async (id: string, data: BugStatusUpdateRequest): Promise<StatusUpdateResponse> => {
    const services = getServiceContainer();
    const bug = await trackRequest(services.getBugRepository().updateStatus(id, data.status as BugStatus));

    // Log activity
    await services.getActivityRepository().create({
      bugId: id,
      action: ActivityAction.STATUS_CHANGED,
      authorId: data.userId,
      newStatus: data.status,
    });

    return { success: true, bug, message: 'Status updated' };
  },

  validate: async (id: string, userId: string): Promise<StatusUpdateResponse> => {
    const services = getServiceContainer();
    const bugRepo = services.getBugRepository();
    const bug = await trackRequest(bugRepo.update(id, { validated: true }));

    // Log activity
    await services.getActivityRepository().create({
      bugId: id,
      action: ActivityAction.VALIDATED,
      authorId: userId,
    });

    return { success: true, bug, message: 'Validated' };
  },

  assign: async (id: string, data: BugAssignRequest): Promise<AssignmentResponse> => {
    const services = getServiceContainer();
    const bug = await trackRequest(services.getBugRepository().updateAssignment(id, data.assignedTo));

    // Log activity
    await services.getActivityRepository().create({
      bugId: id,
      action: ActivityAction.ASSIGNED,
      authorId: data.assignedBy,
      assignedToId: data.assignedTo,
    });

    return { success: true, bug, message: 'Assigned' };
  },

  updateSprint: async (id: string, sprintId: string | null): Promise<BugResponse> => {
    const services = getServiceContainer();
    const bug = await trackRequest(services.getBugRepository().update(id, { sprintId }));
    return bug;
  },

  updateTags: async (id: string, tags: string[]): Promise<BugResponse> => {
    const services = getServiceContainer();
    const bug = await trackRequest(services.getBugRepository().update(id, { tags: tags as BugTag[] }));
    return bug;
  },
};

// Comment API endpoints
export const commentApi = {
  create: async (data: CommentCreateRequest): Promise<CommentResponse> => {
    const services = getServiceContainer();
    const comment = await trackRequest(services.getCommentRepository().create(data));

    // Log activity
    await services.getActivityRepository().create({
      bugId: data.bugId,
      action: ActivityAction.COMMENTED,
      authorId: data.authorId,
    });

    return comment;
  },

  getByBugId: async (bugId: string): Promise<Comment[]> => {
    const services = getServiceContainer();
    return trackRequest(services.getCommentRepository().getByBug(bugId));
  },
};

// Project API endpoints
export const projectApi = {
  getAll: async (): Promise<Project[]> => {
    const services = getServiceContainer();
    return trackRequest(services.getProjectRepository().getAll());
  },

  create: async (data: ProjectCreateRequest): Promise<ProjectResponse> => {
    const services = getServiceContainer();
    const project = await trackRequest(services.getProjectRepository().create(data));
    return project;
  },

  getById: async (id: string): Promise<ProjectResponse> => {
    const services = getServiceContainer();
    const project = await trackRequest(services.getProjectRepository().getById(id));
    if (!project) throw new Error('Project not found');
    return project;
  },
};

// User API endpoints
export const userApi = {
  getAll: async (): Promise<User[]> => {
    const services = getServiceContainer();
    return trackRequest(services.getUserRepository().getAll());
  },

  getById: async (id: string): Promise<User> => {
    const services = getServiceContainer();
    const user = await trackRequest(services.getUserRepository().getById(id));
    if (!user) throw new Error('User not found');
    return user;
  },
};

// Activity Log API endpoints
export const activityLogApi = {
  getAll: async (): Promise<ActivityLog[]> => {
    const services = getServiceContainer();
    const activities = await trackRequest(services.getActivityRepository().getAll());
    return Promise.all(activities.map(enrichActivity));
  },

  getByBugId: async (bugId: string): Promise<ActivityLog[]> => {
    const services = getServiceContainer();
    const activities = await trackRequest(services.getActivityRepository().getByBug(bugId));
    return Promise.all(activities.map(enrichActivity));
  },

  getRecent: async (limit: number = 10): Promise<ActivityLog[]> => {
    const services = getServiceContainer();
    const activities = await trackRequest(services.getActivityRepository().getRecent(limit));
    return Promise.all(activities.map(enrichActivity));
  },
};

// Sprint API endpoints
export const sprintApi = {
  getAll: async (): Promise<Sprint[]> => {
    const services = getServiceContainer();
    return trackRequest(services.getSprintRepository().getAll());
  },

  getByProject: async (projectId: string): Promise<Sprint[]> => {
    const services = getServiceContainer();
    return trackRequest(services.getSprintRepository().getByProject(projectId));
  },

  update: async (id: string, data: Partial<Sprint>): Promise<Sprint> => {
    const services = getServiceContainer();
    return trackRequest(services.getSprintRepository().update(id, data));
  },

  create: async (data: CreateSprintInput): Promise<Sprint> => {
    const services = getServiceContainer();
    return trackRequest(services.getSprintRepository().create(data));
  },
};

const apiClient = {
  bug: bugApi,
  comment: commentApi,
  project: projectApi,
  user: userApi,
  activityLog: activityLogApi,
  sprint: sprintApi,
};

export default apiClient;
