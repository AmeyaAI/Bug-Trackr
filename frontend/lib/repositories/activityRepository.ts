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

  async getAll(): Promise<Activity[]> {
    logger.debug('Fetching all activities');

    const activities = await this.collectionDb.getAllItems<Activity>(COLLECTION_PLURAL, {
      includeDetail: false,
      pageSize: 1000,
    });

    logger.info('Activities fetched successfully', { count: activities.length });
    return activities;
  }

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
