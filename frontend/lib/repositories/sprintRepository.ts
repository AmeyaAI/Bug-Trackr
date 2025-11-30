import { CollectionDBService } from '../services/collectionDb';
import { CacheService } from '../services/cacheService';
import { Sprint, CreateSprintInput, UpdateSprintInput, SprintStatus } from '../models/sprint';
import { logger } from '../utils/logger';

const COLLECTION_PLURAL = 'bug_tracking_sprintss';
const COLLECTION_SINGULAR = 'bug_tracking_sprints';

/**
 * Transforms sprint data from Collection DB
 */
function transformSprintFromStorage(sprint: Record<string, unknown>): Sprint {
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

  const id = (sprint.id || sprint._id || sprint.__auto_id__) as string;
  const projectId = (sprint.projectId || sprint.project_id) as string;
  const name = (sprint.name || '') as string;
  const goal = (sprint.goal || '') as string;
  const status = (sprint.status || 'planned') as SprintStatus;
  
  const startDate = parseDate(sprint.startDate || sprint.start_date);
  const endDate = parseDate(sprint.endDate || sprint.end_date);
  const createdAt = parseDate(sprint.createdAt || sprint.created_at);
  const updatedAt = parseDate(sprint.updatedAt || sprint.updated_at);

  return {
    id,
    projectId,
    name,
    startDate,
    endDate,
    goal,
    status,
    createdAt,
    updatedAt,
  };
}

export class SprintRepository {
  constructor(
    private readonly collectionDb: CollectionDBService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Creates a new sprint
   */
  async create(data: CreateSprintInput): Promise<Sprint> {
    logger.debug('Creating sprint', { name: data.name, projectId: data.projectId });

    const now = new Date();
    const sprintToCreate = {
      ...data,
      status: data.status || 'planned',
      createdAt: now,
      updatedAt: now,
    };

    // CollectionDBService handles camelCase -> snake_case conversion
    const createdSprint = await this.collectionDb.createItem<Record<string, unknown>>(
      COLLECTION_PLURAL,
      sprintToCreate
    );

    const sprint = transformSprintFromStorage(createdSprint);
    
    // Invalidate cache for this project
    this.cacheService.delete(`sprints:project:${data.projectId}`);
    
    logger.info('Sprint created successfully', { id: sprint.id, name: sprint.name });
    return sprint;
  }

  /**
   * Retrieves a sprint by ID
   */
  async getById(id: string): Promise<Sprint | null> {
    logger.debug('Fetching sprint by ID', { id });

    const sprint = await this.collectionDb.getItemById<Record<string, unknown>>(
      COLLECTION_SINGULAR,
      id
    );

    if (!sprint) {
      logger.debug('Sprint not found', { id });
      return null;
    }

    return transformSprintFromStorage(sprint);
  }

  /**
   * Updates a sprint
   */
  async update(id: string, updates: UpdateSprintInput): Promise<Sprint> {
    logger.debug('Updating sprint', { id, updates });

    const updatedSprint = await this.collectionDb.updateItem<Record<string, unknown>>(
      COLLECTION_SINGULAR,
      id,
      {
        ...updates,
        updatedAt: new Date(),
      }
    );

    const sprint = transformSprintFromStorage(updatedSprint);
    
    // Invalidate cache for this project
    this.cacheService.delete(`sprints:project:${sprint.projectId}`);

    logger.info('Sprint updated successfully', { id });
    return sprint;
  }

  /**
   * Retrieves sprints by project ID
   */
  async getByProject(projectId: string): Promise<Sprint[]> {
    // Check cache first
    const cacheKey = `sprints:project:${projectId}`;
    const cached = this.cacheService.get<Sprint[]>(cacheKey);
    if (cached) {
      return cached;
    }

    logger.debug('Fetching sprints by project', { projectId });

    const sprints = await this.collectionDb.queryItems<Record<string, unknown>>(
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

    const transformedSprints = sprints.map(transformSprintFromStorage);
    
    // Update cache
    this.cacheService.set(cacheKey, transformedSprints);

    logger.info('Sprints fetched by project successfully', { projectId, count: transformedSprints.length });
    return transformedSprints;
  }
}
