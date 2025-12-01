/**
 * Activity Repository - Data access layer for Activity entities
 * 
 * Handles all CRUD operations for activities in the Collection DB.
 * Provides filter query optimization for fetching activities by bug.
 * Supports fetching recent activities with page_size parameter.
 * 
 * Collection Names:
 * - Plural (list operations): 'bug_tracking_activitiess'
 * - Singular (item operations): 'bug_tracking_activities'
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.6
 */

import { CollectionDBService } from '../services/collectionDb';
import { Activity, CreateActivityInput, ActivityAction } from '../models/activity';
import { logger } from '../utils/logger';
import { CacheService } from '../services/cacheService';

const COLLECTION_PLURAL = 'bug_tracking_activitiess';
const COLLECTION_SINGULAR = 'bug_tracking_activities';
// const CACHE_TTL = 60 * 1000; // 1 minute cache for activities

/**
 * Transforms activity data for Collection DB storage
 * Ensures relational fields are stored as arrays
 */
function transformActivityForStorage(activity: Partial<Activity>): Record<string, unknown> {
  const { bugId, authorId, ...rest } = activity;
  
  const storageData: Record<string, unknown> = { ...rest };

  if (bugId !== undefined) {
    storageData.bugId = [bugId];
  }

  if (authorId !== undefined) {
    storageData.authorId = [authorId];
  }

  return storageData;
}

/**
 * Transforms activity data from Collection DB
 * Extracts relational fields from arrays to single values
 * Handles both camelCase and snake_case keys for robustness
 */
function transformActivityFromStorage(activity: Record<string, unknown>): Activity {
  // Helper to extract single value from array or value
  const extractSingle = (val: unknown) => {
    if (Array.isArray(val)) {
      return val.length > 0 ? val[0] : undefined;
    }
    // Handle stringified array case
    if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
      try {
        const parsed = JSON.parse(val.replace(/'/g, '"'));
        if (Array.isArray(parsed)) {
          return parsed.length > 0 ? parsed[0] : undefined;
        }
      } catch {
        // Ignore
      }
    }
    return val;
  };

  // Helper to parse date from string, number, or Date
  const parseDate = (val: unknown): Date => {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof val === 'string' || typeof val === 'number') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
  };

  const id = (activity.id || activity._id || activity.__auto_id__) as string;
  const action = (activity.action || 'reported') as ActivityAction; // Default to reported if missing
  
  const bugIdRaw = activity.bugId || activity.bug_id;
  const authorIdRaw = activity.authorId || activity.author_id;
  
  const bugId = extractSingle(bugIdRaw) as string;
  const authorId = extractSingle(authorIdRaw) as string;
  
  const timestampRaw = activity.timestamp || activity.created_at || activity.created;
  const timestamp = parseDate(timestampRaw);

  return {
    id,
    bugId,
    action,
    authorId,
    timestamp,
  };
}

export class ActivityRepository {
  constructor(
    private readonly collectionDb: CollectionDBService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Creates a new activity in the collection database.
   *
   * @param {CreateActivityInput} activityData - The data for the activity to create.
   * @returns {Promise<Activity>} The created activity.
   * @throws {Error} If the activity could not be created.
   */
  async create(activityData: CreateActivityInput): Promise<Activity> {
    logger.debug('Creating activity', { bugId: activityData.bugId, action: activityData.action });

    const activityToCreate = {
      ...activityData,
      timestamp: new Date(),
    };

    const storageData = transformActivityForStorage(activityToCreate);

    const createdActivity = await this.collectionDb.createItem<Record<string, unknown>>(
      COLLECTION_PLURAL,
      storageData
    );

    const activity = transformActivityFromStorage(createdActivity);

    logger.info('Activity created successfully', { 
      id: activity.id, 
      bugId: activity.bugId, 
      action: activity.action 
    });
    return activity;
  }

  /**
   * Fetches all activities from the collection.
   *
   * @returns {Promise<Activity[]>} Promise resolving to an array of Activity objects.
   * @throws {Error} If the database service fails to fetch activities.
   */
  async getAll(): Promise<Activity[]> {
    logger.debug('Fetching all activities');

    const activities = await this.collectionDb.getAllItems<Record<string, unknown>>(COLLECTION_PLURAL, {
      includeDetail: false,
      pageSize: 1000,
    });

    const transformedActivities = activities.map(transformActivityFromStorage);
    
    logger.info('Activities fetched successfully', { count: transformedActivities.length });
    return transformedActivities;
  }

  /**
   * Fetches an activity by its unique identifier.
   *
   * @param activityId - The unique identifier of the activity to retrieve.
   * @returns The activity if found, or null if not found.
   * @throws {Error} If the underlying database service fails.
   */
  async getById(activityId: string): Promise<Activity | null> {
    logger.debug('Fetching activity by ID', { activityId });

    const activity = await this.collectionDb.getItemById<Record<string, unknown>>(
      COLLECTION_SINGULAR,
      activityId
    );

    if (activity) {
      const transformed = transformActivityFromStorage(activity);
      logger.info('Activity fetched successfully', { activityId });
      return transformed;
    } else {
      logger.debug('Activity not found', { activityId });
      return null;
    }
  }

  /**
   * Fetches all activities associated with a specific bug.
   *
   * @param {string} bugId - The unique identifier of the bug to filter activities by.
   * @returns {Promise<Activity[]>} A promise that resolves to an array of activities related to the specified bug.
   * @throws {Error} If the underlying database query fails.
   */
  async getByBug(bugId: string): Promise<Activity[]> {
    logger.debug('Fetching activities by bug', { bugId });

    const activities = await this.collectionDb.queryItems<Record<string, unknown>>(
      COLLECTION_PLURAL,
      [
        {
          field_name: 'payload.bug_id',
          field_value: bugId,
          operator: 'like',
        },
      ],
      {
        includeDetail: false,
        pageSize: 1000,
      }
    );

    const transformedActivities = activities.map(transformActivityFromStorage);
    
    logger.info('Activities fetched by bug successfully', { bugId, count: transformedActivities.length });
    return transformedActivities;
  }

  /**
   * Fetches the most recent activities up to the specified limit.
   *
   * @param {number} limit - The maximum number of recent activities to retrieve (max 1000).
   * @returns {Promise<Activity[]>} A promise that resolves to an array of recent activities.
   * @throws {Error} If the underlying database query fails.
   */
  async getRecent(limit: number): Promise<Activity[]> {
    logger.debug('Fetching recent activities', { limit });

    const activities = await this.collectionDb.getAllItems<Record<string, unknown>>(COLLECTION_PLURAL, {
      includeDetail: false,
      pageSize: Math.min(limit, 1000),
    });

    const transformedActivities = activities.map(transformActivityFromStorage);
    
    // Sort by timestamp descending if not already sorted by DB
    transformedActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Slice to limit
    const limitedActivities = transformedActivities.slice(0, limit);
    
    logger.info('Recent activities fetched successfully', { count: limitedActivities.length, limit });
    return limitedActivities;
  }
}