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
import { Activity, CreateActivityInput } from '../models/activity';
import { logger } from '../utils/logger';

const COLLECTION_PLURAL = 'bug_tracking_activitiess';
const COLLECTION_SINGULAR = 'bug_tracking_activities';

export class ActivityRepository {
  constructor(private readonly collectionDb: CollectionDBService) {}

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

    const createdActivity = await this.collectionDb.createItem<Activity>(
      COLLECTION_PLURAL,
      activityToCreate
    );

    logger.info('Activity created successfully', { 
      id: createdActivity.id, 
      bugId: createdActivity.bugId,
      action: createdActivity.action 
    });
    return createdActivity;
  }

  /**
   * Fetches all activities from the collection.
   *
   * @returns {Promise<Activity[]>} Promise resolving to an array of Activity objects.
   * @throws {Error} If the database service fails to fetch activities.
   */
  async getAll(): Promise<Activity[]> {
    logger.debug('Fetching all activities');

    const activities = await this.collectionDb.getAllItems<Activity>(COLLECTION_PLURAL, {
      includeDetail: false,
      pageSize: 1000,
    });

    logger.info('Activities fetched successfully', { count: activities.length });
    return activities;
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

    const activity = await this.collectionDb.getItemById<Activity>(
      COLLECTION_SINGULAR,
      activityId
    );

    if (activity) {
      logger.info('Activity fetched successfully', { activityId });
    } else {
      logger.debug('Activity not found', { activityId });
    }

    return activity;
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

    const activities = await this.collectionDb.queryItems<Activity>(
      COLLECTION_PLURAL,
      [
        {
          field_name: 'payload.bug_id',
          field_value: bugId,
          operator: 'eq',
        },
      ],
      {
        includeDetail: false,
        pageSize: 1000,
      }
    );

    logger.info('Activities fetched by bug successfully', { bugId, count: activities.length });
    return activities;
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

    const activities = await this.collectionDb.getAllItems<Activity>(COLLECTION_PLURAL, {
      includeDetail: false,
      pageSize: Math.min(limit, 1000),
    });

    logger.info('Recent activities fetched successfully', { count: activities.length, limit });
    return activities;
  }
}
