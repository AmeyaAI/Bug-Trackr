/**
 * Bug Repository - Data access layer for Bug entities
 * 
 * Handles all CRUD operations for bugs in the Collection DB.
 * Provides filter query optimization for common queries.
 * Handles tags array ↔ comma-separated string conversion.
 * Provides relation helper methods to fetch related entities.
 * 
 * Collection Names:
 * - Plural (list operations): 'bug_tracking_bugss'
 * - Singular (item operations): 'bug_tracking_bugs'
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7
 */

import { CollectionDBService } from '../services/collectionDb';
import { Bug, CreateBugInput, UpdateBugInput, BugStatus, BugTag } from '../models/bug';
import { Project } from '../models/project';
import { User } from '../models/user';
import { logger } from '../utils/logger';

const COLLECTION_PLURAL = 'bug_tracking_bugss';
const COLLECTION_SINGULAR = 'bug_tracking_bugs';

/**
 * Converts tags array to comma-separated string for Collection DB storage
 */
function tagsToString(tags: BugTag[]): string {
  return tags.join(',');
}

/**
 * Converts comma-separated string to tags array from Collection DB
 */
function tagsFromString(tagsStr: string): BugTag[] {
  if (!tagsStr || tagsStr.trim() === '') {
    return [];
  }
  return tagsStr.split(',').map(t => t.trim() as BugTag);
}

/**
 * Transforms bug data for Collection DB storage (tags array → string)
 */
function transformBugForStorage(bug: Partial<Bug>): Record<string, unknown> {
  const { tags, ...rest } = bug;
  return {
    ...rest,
    tags: tags ? tagsToString(tags) : '',
  };
}

/**
 * Transforms bug data from Collection DB (tags string → array)
 */
function transformBugFromStorage(bug: Record<string, unknown>): Bug {
  const { tags, ...rest } = bug;
  return {
    ...rest,
    tags: typeof tags === 'string' ? tagsFromString(tags) : [],
  } as Bug;
}

export class BugRepository {
  constructor(private readonly collectionDb: CollectionDBService) {}

  /**
   * Creates a new bug
   * @param bugData - Bug data without ID and timestamps
   * @returns Created bug with ID and timestamps
   * @throws {Error} On validation errors or server errors
   */
  async create(bugData: CreateBugInput): Promise<Bug> {
    logger.debug('Creating bug', { title: bugData.title, projectId: bugData.projectId });

    const now = new Date();
    const bugToCreate = {
      ...bugData,
      validated: false,  // New bugs are not validated by default
      createdAt: now,
      updatedAt: now,
    };

    // Transform tags array to string for storage
    const storageData = transformBugForStorage(bugToCreate);

    const createdBug = await this.collectionDb.createItem<Record<string, unknown>>(
      COLLECTION_PLURAL,
      storageData
    );

    // Transform tags string back to array
    const bug = transformBugFromStorage(createdBug);

    logger.info('Bug created successfully', { id: bug.id, title: bug.title });
    return bug;
  }

  /**
   * Retrieves all bugs
   * @returns Array of all bugs
   * @throws {Error} On server errors
   */
  async getAll(): Promise<Bug[]> {
    logger.debug('Fetching all bugs');

    const bugs = await this.collectionDb.getAllItems<Record<string, unknown>>(COLLECTION_PLURAL, {
      includeDetail: false, // Faster queries
      pageSize: 1000,
    });

    // Transform tags string to array for each bug
    const transformedBugs = bugs.map(transformBugFromStorage);

    logger.info('Bugs fetched successfully', { count: transformedBugs.length });
    return transformedBugs;
  }

  /**
   * Retrieves a bug by ID
   * @param bugId - Bug ID
   * @returns Bug or null if not found
   * @throws {Error} On server errors
   */
  async getById(bugId: string): Promise<Bug | null> {
    logger.debug('Fetching bug by ID', { bugId });

    const bug = await this.collectionDb.getItemById<Record<string, unknown>>(
      COLLECTION_SINGULAR,
      bugId
    );

    if (!bug) {
      logger.debug('Bug not found', { bugId });
      return null;
    }

    // Transform tags string to array
    const transformedBug = transformBugFromStorage(bug);

    logger.info('Bug fetched successfully', { bugId });
    return transformedBug;
  }

  /**
   * Retrieves bugs by project ID
   * Uses filter query for optimized retrieval
   * @param projectId - Project ID
   * @returns Array of bugs for the project
   * @throws {Error} On server errors
   */
  async getByProject(projectId: string): Promise<Bug[]> {
    logger.debug('Fetching bugs by project', { projectId });

    const bugs = await this.collectionDb.queryItems<Record<string, unknown>>(
      COLLECTION_PLURAL,
      [
        {
          field_name: 'payload.project_id',
          field_value: projectId,
          operator: 'eq',
        },
      ],
      {
        includeDetail: false,
        pageSize: 1000,
      }
    );

    // Transform tags string to array for each bug
    const transformedBugs = bugs.map(transformBugFromStorage);

    logger.info('Bugs fetched by project successfully', { projectId, count: transformedBugs.length });
    return transformedBugs;
  }

  /**
   * Retrieves bugs by assignee ID
   * Uses filter query for optimized retrieval
   * @param assigneeId - User ID of assignee
   * @returns Array of bugs assigned to the user
   * @throws {Error} On server errors
   */
  async getByAssignee(assigneeId: string): Promise<Bug[]> {
    logger.debug('Fetching bugs by assignee', { assigneeId });

    const bugs = await this.collectionDb.queryItems<Record<string, unknown>>(
      COLLECTION_PLURAL,
      [
        {
          field_name: 'payload.assigned_to',
          field_value: assigneeId,
          operator: 'eq',
        },
      ],
      {
        includeDetail: false,
        pageSize: 1000,
      }
    );

    // Transform tags string to array for each bug
    const transformedBugs = bugs.map(transformBugFromStorage);

    logger.info('Bugs fetched by assignee successfully', { assigneeId, count: transformedBugs.length });
    return transformedBugs;
  }

  /**
   * Retrieves bugs by status
   * Uses filter query for optimized retrieval
   * @param status - Bug status
   * @returns Array of bugs with the specified status
   * @throws {Error} On server errors
   */
  async getByStatus(status: BugStatus): Promise<Bug[]> {
    logger.debug('Fetching bugs by status', { status });

    const bugs = await this.collectionDb.queryItems<Record<string, unknown>>(
      COLLECTION_PLURAL,
      [
        {
          field_name: 'payload.status',
          field_value: status,
          operator: 'eq',
        },
      ],
      {
        includeDetail: false,
        pageSize: 1000,
      }
    );

    // Transform tags string to array for each bug
    const transformedBugs = bugs.map(transformBugFromStorage);

    logger.info('Bugs fetched by status successfully', { status, count: transformedBugs.length });
    return transformedBugs;
  }

  /**
   * Updates bug status
   * @param bugId - Bug ID
   * @param status - New status
   * @returns Updated bug
   * @throws {Error} On validation errors, not found, or server errors
   */
  async updateStatus(bugId: string, status: BugStatus): Promise<Bug> {
    logger.debug('Updating bug status', { bugId, status });

    const updatedBug = await this.collectionDb.updateItem<Record<string, unknown>>(
      COLLECTION_SINGULAR,
      bugId,
      {
        status,
        updatedAt: new Date(),
      }
    );

    // Transform tags string to array
    const transformedBug = transformBugFromStorage(updatedBug);

    logger.info('Bug status updated successfully', { bugId, status });
    return transformedBug;
  }

  /**
   * Updates bug assignment
   * @param bugId - Bug ID
   * @param assignedTo - User ID to assign to (or null to unassign)
   * @returns Updated bug
   * @throws {Error} On validation errors, not found, or server errors
   */
  async updateAssignment(bugId: string, assignedTo: string | null): Promise<Bug> {
    logger.debug('Updating bug assignment', { bugId, assignedTo });

    const updatedBug = await this.collectionDb.updateItem<Record<string, unknown>>(
      COLLECTION_SINGULAR,
      bugId,
      {
        assignedTo,
        updatedAt: new Date(),
      }
    );

    // Transform tags string to array
    const transformedBug = transformBugFromStorage(updatedBug);

    logger.info('Bug assignment updated successfully', { bugId, assignedTo });
    return transformedBug;
  }

  /**
   * Updates an existing bug
   * @param bugId - Bug ID
   * @param updates - Partial bug updates
   * @returns Updated bug
   * @throws {Error} On validation errors, not found, or server errors
   */
  async update(bugId: string, updates: UpdateBugInput): Promise<Bug> {
    logger.debug('Updating bug', { bugId, updates });

    // Transform tags array to string if present
    const storageUpdates = transformBugForStorage({
      ...updates,
      updatedAt: new Date(),
    });

    const updatedBug = await this.collectionDb.updateItem<Record<string, unknown>>(
      COLLECTION_SINGULAR,
      bugId,
      storageUpdates
    );

    // Transform tags string to array
    const transformedBug = transformBugFromStorage(updatedBug);

    logger.info('Bug updated successfully', { bugId });
    return transformedBug;
  }

  /**
   * Deletes a bug
   * @param bugId - Bug ID
   * @returns True if deleted successfully
   * @throws {Error} On not found or server errors
   */
  async delete(bugId: string): Promise<boolean> {
    logger.debug('Deleting bug', { bugId });

    const deleted = await this.collectionDb.deleteItem(COLLECTION_SINGULAR, bugId);

    logger.info('Bug deleted successfully', { bugId });
    return deleted;
  }

  /**
   * Relation helper: Retrieves the project associated with a bug
   * @param bug - Bug entity
   * @returns Project or null if not found
   * @throws {Error} On server errors
   */
  async getProject(bug: Bug): Promise<Project | null> {
    logger.debug('Fetching bug project', { bugId: bug.id, projectId: bug.projectId });

    const project = await this.collectionDb.getItemById<Project>(
      'bug_tracking_project',
      bug.projectId
    );

    if (project) {
      logger.info('Bug project fetched successfully', { bugId: bug.id, projectId: project.id });
    } else {
      logger.warn('Bug project not found', { bugId: bug.id, projectId: bug.projectId });
    }

    return project;
  }

  /**
   * Relation helper: Retrieves the reporter (User) of a bug
   * @param bug - Bug entity
   * @returns User who reported the bug, or null if not found
   * @throws {Error} On server errors
   */
  async getReporter(bug: Bug): Promise<User | null> {
    logger.debug('Fetching bug reporter', { bugId: bug.id, reportedBy: bug.reportedBy });

    const user = await this.collectionDb.getItemById<User>('user', bug.reportedBy);

    if (user) {
      logger.info('Bug reporter fetched successfully', { bugId: bug.id, userId: user.id });
    } else {
      logger.warn('Bug reporter not found', { bugId: bug.id, reportedBy: bug.reportedBy });
    }

    return user;
  }

  /**
   * Relation helper: Retrieves the assignee (User) of a bug
   * @param bug - Bug entity
   * @returns User assigned to the bug, or null if not assigned or not found
   * @throws {Error} On server errors
   */
  async getAssignee(bug: Bug): Promise<User | null> {
    if (!bug.assignedTo) {
      logger.debug('Bug has no assignee', { bugId: bug.id });
      return null;
    }

    logger.debug('Fetching bug assignee', { bugId: bug.id, assignedTo: bug.assignedTo });

    const user = await this.collectionDb.getItemById<User>('user', bug.assignedTo);

    if (user) {
      logger.info('Bug assignee fetched successfully', { bugId: bug.id, userId: user.id });
    } else {
      logger.warn('Bug assignee not found', { bugId: bug.id, assignedTo: bug.assignedTo });
    }

    return user;
  }
}
