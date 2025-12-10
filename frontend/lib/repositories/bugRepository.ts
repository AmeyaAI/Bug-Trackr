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

import { CollectionDBService, FilterQuery } from '../services/collectionDb';
import { CacheService } from '../services/cacheService';
import { Bug, CreateBugInput, UpdateBugInput, BugStatus, BugTag, BugPriority, BugSeverity, BugType } from '../models/bug';
import { Project } from '../models/project';
import { User } from '../models/user';
import { logger } from '../utils/logger';

const COLLECTION_PLURAL = 'bug_tracking_bugss';
const COLLECTION_SINGULAR = 'bug_tracking_bugs';
// const CACHE_TTL = 60 * 1000; // 1 minute cache for bugs

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
 * Also ensures relational fields are stored as arrays
 */
function transformBugForStorage(bug: Partial<Bug>): Record<string, unknown> {
  const { tags, projectId, reportedBy, assignedTo, sprintId, ...rest } = bug;
  
  const storageData: Record<string, unknown> = {
    ...rest,
    tags: tags ? tagsToString(tags) : '',
  };

  if (projectId !== undefined) {
    storageData.projectId = [projectId];
  }

  if (reportedBy !== undefined) {
    storageData.reportedBy = [reportedBy];
  }

  if (assignedTo !== undefined) {
    storageData.assignedTo = assignedTo ? [assignedTo] : [];
  }

  if (sprintId !== undefined) {
    storageData.sprintId = sprintId ? [sprintId] : [];
  }

  return storageData;
}

/**
 * Transforms bug data from Collection DB (tags string → array)
 * Also extracts relational fields from arrays to single values
 * Handles both camelCase and snake_case keys for robustness
 */
function transformBugFromStorage(bug: Record<string, unknown>): Bug {
  // Helper to extract single value from array or value
  const extractSingle = (val: unknown) => {
    if (Array.isArray(val)) {
      return val.length > 0 ? val[0] : undefined;
    }
    // Handle stringified array case: "['uuid']" or '["uuid"]'
    if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
      try {
        const parsed = JSON.parse(val.replace(/'/g, '"')); // Handle single quotes if necessary
        if (Array.isArray(parsed)) {
          return parsed.length > 0 ? parsed[0] : undefined;
        }
      } catch {
        // Not valid JSON, treat as string
      }
    }
    return val;
  };

  // Helper to parse date from string, number, or Date
  const parseDate = (val: unknown): Date => {
    if (!val) return new Date(); // Default to now if missing, or handle as invalid?
    if (val instanceof Date) return val;
    if (typeof val === 'string' || typeof val === 'number') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
  };

  // Explicitly map all fields to ensure correctness
  const id = (bug.id || bug._id || bug.__auto_id__) as string;
  const title = (bug.title || '') as string;
  const description = (bug.description || '') as string;
  const status = (bug.status || BugStatus.OPEN) as BugStatus;
  const priority = (bug.priority || BugPriority.MEDIUM) as BugPriority;
  const severity = (bug.severity || BugSeverity.MINOR) as BugSeverity;
  
  const projectIdRaw = bug.projectId || bug.project_id;
  const reportedByRaw = bug.reportedBy || bug.reported_by;
  const assignedToRaw = bug.assignedTo || bug.assigned_to;
  
  const projectId = extractSingle(projectIdRaw) as string;
  const reportedBy = extractSingle(reportedByRaw) as string;
  const assignedTo = (extractSingle(assignedToRaw) as string) || null;
  
  const sprintIdRaw = bug.sprintId || bug.sprint_id;
  const sprintId = (extractSingle(sprintIdRaw) as string) || null;

  const type = (bug.type || 'bug') as BugType;

  const attachments = (bug.attachments || '') as string;
  const tagsRaw = bug.tags;
  const tags = typeof tagsRaw === 'string' ? tagsFromString(tagsRaw) : [];
  
  const validated = !!bug.validated;
  
  const createdAtRaw = bug.createdAt || bug.created_at || bug.created;
  const updatedAtRaw = bug.updatedAt || bug.updated_at || bug.updated;
  
  const createdAt = parseDate(createdAtRaw);
  const updatedAt = parseDate(updatedAtRaw);

  return {
    id,
    title,
    description,
    status,
    priority,
    severity,
    projectId,
    reportedBy,
    assignedTo,
    sprintId,
    type,
    attachments,
    tags,
    validated,
    createdAt,
    updatedAt,
  };
}

export class BugRepository {
  constructor(
    private readonly collectionDb: CollectionDBService,
    private readonly cacheService?: CacheService
  ) {}

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

    // Cache the new bug
    if (this.cacheService) {
      this.cacheService.set(`bug:${bug.id}`, bug);
    }

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
   * Retrieves all bugs with pagination
   * @param pageSize - Number of items per page
   * @param lastEvaluatedKey - Cursor for next page
   * @returns Object with bugs and next cursor
   */
  async getAllPaginated(pageSize: number, lastEvaluatedKey?: string): Promise<{ bugs: Bug[], lastEvaluatedKey: Record<string, unknown> | null }> {
    logger.debug('Fetching paginated bugs', { pageSize, lastEvaluatedKey });

    const result = await this.collectionDb.getAllItemsPaginated<Record<string, unknown>>(COLLECTION_PLURAL, {
      includeDetail: false,
      pageSize,
      lastEvaluatedKey,
    });

    // Transform tags string to array for each bug
    const transformedBugs = result.items.map(transformBugFromStorage);

    logger.info('Bugs fetched successfully', { count: transformedBugs.length });
    return {
      bugs: transformedBugs,
      lastEvaluatedKey: result.lastEvaluatedKey
    };
  }

  /**
   * Retrieves a bug by ID
   * @param bugId - Bug ID
   * @returns Bug or null if not found
   * @throws {Error} On server errors
   */
  async getById(bugId: string): Promise<Bug | null> {
    // Check cache first
    if (this.cacheService) {
      const cachedBug = this.cacheService.get<Bug>(`bug:${bugId}`);
      if (cachedBug) {
        return cachedBug;
      }
    }

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

    // Cache the result
    if (this.cacheService) {
      this.cacheService.set(`bug:${bugId}`, transformedBug);
    }

    logger.info('Bug fetched successfully', { bugId });
    return transformedBug;
  }

  /**
   * Searches bugs with filters and pagination
   * @param filters - Filter criteria
   * @param pageSize - Number of items per page
   * @param lastEvaluatedKey - Cursor for next page
   * @returns Object with bugs and next cursor
   */
  async search(
    filters: {
      projectId?: string;
      status?: BugStatus;
      assignedTo?: string;
      priority?: BugPriority;
      severity?: BugSeverity;
      type?: BugType;
      searchQuery?: string;
      sprintId?: string | null;
    },
    pageSize: number,
    lastEvaluatedKey?: string
  ): Promise<{ bugs: Bug[], lastEvaluatedKey: Record<string, unknown> | null }> {
    logger.debug('Searching bugs', { filters, pageSize, lastEvaluatedKey });

    // Define all potential filters with their DB and Memory logic
    // Priority: lower is better (more reductive/important)
    const allFilters: {
        id: string;
        priority: number;
        isApplicable: boolean;
        addToDb: (arr: FilterQuery[]) => void;
        applyToMem: (bugs: Bug[]) => Bug[];
    }[] = [
        {
            id: 'projectId',
            priority: 1,
            isApplicable: !!filters.projectId && filters.projectId !== 'all',
            addToDb: (arr) => arr.push({ field_name: 'payload.project_id', field_value: filters.projectId!, operator: 'like' }),
            applyToMem: (bugs) => bugs.filter(b => b.projectId === filters.projectId)
        },
        {
            id: 'sprintId',
            priority: 2,
            isApplicable: !!filters.sprintId && filters.sprintId !== 'all',
            addToDb: (arr) => {
                 if (filters.sprintId === 'backlog') {
                    arr.push({ field_name: 'payload.sprint_id', field_value: [], operator: 'eq' });
                 } else {
                    arr.push({ field_name: 'payload.sprint_id', field_value: filters.sprintId!, operator: 'like' });
                 }
            },
            applyToMem: (bugs) => {
                if (filters.sprintId === 'backlog') return bugs.filter(b => !b.sprintId);
                return bugs.filter(b => b.sprintId === filters.sprintId);
            }
        },
        {
            id: 'searchQuery',
            priority: 3,
            isApplicable: !!filters.searchQuery,
            addToDb: (arr) => arr.push({ field_name: 'payload.title', field_value: filters.searchQuery!, operator: 'like' }),
            applyToMem: (bugs) => {
                const q = filters.searchQuery!.toLowerCase();
                return bugs.filter(b => b.title.toLowerCase().includes(q));
            }
        },
        {
            id: 'assignedTo',
            priority: 4,
            isApplicable: !!filters.assignedTo && filters.assignedTo !== 'all',
            addToDb: (arr) => {
                if (filters.assignedTo === 'unassigned') {
                    arr.push({ field_name: 'payload.assigned_to', field_value: null, operator: 'eq' });
                } else {
                    arr.push({ field_name: 'payload.assigned_to', field_value: filters.assignedTo!, operator: 'eq' });
                }
            },
            applyToMem: (bugs) => {
                if (filters.assignedTo === 'unassigned') return bugs.filter(b => !b.assignedTo);
                return bugs.filter(b => b.assignedTo === filters.assignedTo);
            }
        },
        {
            id: 'status',
            priority: 5,
            isApplicable: !!filters.status && (filters.status as string) !== 'all',
            addToDb: (arr) => arr.push({ field_name: 'payload.status', field_value: filters.status!, operator: 'eq' }),
            applyToMem: (bugs) => bugs.filter(b => b.status === filters.status)
        },
        {
            id: 'type',
            priority: 6,
            isApplicable: !!filters.type && (filters.type as string) !== 'all',
            addToDb: (arr) => arr.push({ field_name: 'payload.type', field_value: filters.type!, operator: 'eq' }),
            applyToMem: (bugs) => bugs.filter(b => b.type === filters.type)
        },
        {
            id: 'priority',
            priority: 7,
            isApplicable: !!filters.priority && (filters.priority as string) !== 'all',
            addToDb: (arr) => arr.push({ field_name: 'payload.priority', field_value: filters.priority!, operator: 'eq' }),
            applyToMem: (bugs) => bugs.filter(b => b.priority === filters.priority)
        },
        {
            id: 'severity',
            priority: 8,
            isApplicable: !!filters.severity && (filters.severity as string) !== 'all',
            addToDb: (arr) => arr.push({ field_name: 'payload.severity', field_value: filters.severity!, operator: 'eq' }),
            applyToMem: (bugs) => bugs.filter(b => b.severity === filters.severity)
        }
    ];

    // Filter out non-applicable ones and sort by priority
    const activeFilters = allFilters.filter(f => f.isApplicable).sort((a, b) => a.priority - b.priority);

    // Determine split: Max 2 filters to DB to prevent crashes
    const MAX_DB_FILTERS = 2;
    const dbFiltersToApply = activeFilters.slice(0, MAX_DB_FILTERS);
    const memFiltersToApply = activeFilters.slice(MAX_DB_FILTERS);

    // Construct DB Query
    const dbFilters: FilterQuery[] = [];
    dbFiltersToApply.forEach(f => f.addToDb(dbFilters));

    const result = await this.collectionDb.queryItemsPaginated<Record<string, unknown>>(
      COLLECTION_PLURAL,
      dbFilters,
      {
        includeDetail: false,
        pageSize,
        lastEvaluatedKey,
      }
    );

    // Transform tags string to array for each bug
    let transformedBugs = result.items.map(transformBugFromStorage);

    // Apply In-Memory Filters
    memFiltersToApply.forEach(f => {
        transformedBugs = f.applyToMem(transformedBugs);
    });

    logger.info('Bugs searched successfully', { 
        count: transformedBugs.length, 
        dbFilters: dbFiltersToApply.map(f => f.id),
        memFilters: memFiltersToApply.map(f => f.id)
    });

    return {
      bugs: transformedBugs,
      lastEvaluatedKey: result.lastEvaluatedKey
    };
  }

  /**
   * Advanced search with raw filter queries
   * @param filters - Array of filter queries
   * @param pageSize - Number of items per page
   * @param lastEvaluatedKey - Cursor for next page
   * @returns Object with bugs and next cursor
   */
  async searchAdvanced(
    filters: FilterQuery[],
    pageSize: number,
    lastEvaluatedKey?: string
  ): Promise<{ bugs: Bug[], lastEvaluatedKey: Record<string, unknown> | null }> {
    logger.debug('Searching bugs (advanced)', { filters, pageSize, lastEvaluatedKey });

    const result = await this.collectionDb.queryItemsPaginated<Record<string, unknown>>(
      COLLECTION_PLURAL,
      filters,
      {
        includeDetail: false,
        pageSize,
        lastEvaluatedKey,
      }
    );

    // Transform tags string to array for each bug
    const transformedBugs = result.items.map(transformBugFromStorage);

    logger.info('Bugs searched successfully (advanced)', { count: transformedBugs.length });
    return {
      bugs: transformedBugs,
      lastEvaluatedKey: result.lastEvaluatedKey
    };
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
          operator: 'like',
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
          operator: 'like',
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

    const now = new Date();
    const updatedBugRaw = await this.collectionDb.updateItem<Record<string, unknown>>(
      COLLECTION_SINGULAR,
      bugId,
      {
        status,
        updatedAt: now,
      },
      true // Fetch after update
    );

    const updatedBug = transformBugFromStorage(updatedBugRaw);

    // Update cache
    if (this.cacheService) {
      this.cacheService.set(`bug:${bugId}`, updatedBug);
    }

    return updatedBug;
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

    const now = new Date();
    const updatedBugRaw = await this.collectionDb.updateItem<Record<string, unknown>>(
      COLLECTION_SINGULAR,
      bugId,
      {
        assignedTo,
        updatedAt: now,
      },
      true // Fetch after update
    );

    const updatedBug = transformBugFromStorage(updatedBugRaw);

    // Update cache
    if (this.cacheService) {
      this.cacheService.set(`bug:${bugId}`, updatedBug);
    }

    return updatedBug;
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

    const now = new Date();
    // Transform tags array to string if present
    const storageUpdates = transformBugForStorage({
      ...updates,
      updatedAt: now,
    });

    const updatedBugRaw = await this.collectionDb.updateItem<Record<string, unknown>>(
      COLLECTION_SINGULAR,
      bugId,
      storageUpdates,
      true // Fetch after update
    );

    const updatedBug = transformBugFromStorage(updatedBugRaw);

    // Update cache
    if (this.cacheService) {
      this.cacheService.set(`bug:${bugId}`, updatedBug);
    }

    return updatedBug;
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

    // Remove from cache
    if (this.cacheService) {
      this.cacheService.delete(`bug:${bugId}`);
    }

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
