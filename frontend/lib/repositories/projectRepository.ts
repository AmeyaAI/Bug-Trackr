/**
 * Project Repository - Data access layer for Project entities
 * 
 * Handles all CRUD operations for projects in the Collection DB.
 * Provides relation helper methods to fetch related entities.
 * 
 * Collection Names:
 * - Plural (list operations): 'bug_tracking_projects'
 * - Singular (item operations): 'bug_tracking_project'
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { CollectionDBService } from '../services/collectionDb';
import { CacheService } from '../services/cacheService';
import { Project, CreateProjectInput, UpdateProjectInput } from '../models/project';
import { User } from '../models/user';
import { logger } from '../utils/logger';

const COLLECTION_PLURAL = 'bug_tracking_projects';
const COLLECTION_SINGULAR = 'bug_tracking_project';
const CACHE_KEY_ALL = 'projects:all';

/**
 * Transforms project data for Collection DB storage
 * Ensures relational fields are stored as arrays
 */
function transformProjectForStorage(project: Partial<Project>): Record<string, unknown> {
  const { createdBy, ...rest } = project;
  
  const storageData: Record<string, unknown> = { ...rest };

  if (createdBy !== undefined) {
    storageData.createdBy = [createdBy];
  }

  return storageData;
}

/**
 * Transforms project data from Collection DB
 * Extracts relational fields from arrays to single values
 * Handles both camelCase and snake_case keys for robustness
 */
function transformProjectFromStorage(project: Record<string, unknown>): Project {
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

  const id = (project.id || project._id || project.__auto_id__) as string;
  const name = (project.name || '') as string;
  const description = (project.description || '') as string;
  
  const createdByRaw = project.createdBy || project.created_by;
  const createdBy = extractSingle(createdByRaw) as string;

  return {
    id,
    name,
    description,
    createdBy,
  };
}

export class ProjectRepository {
  constructor(
    private readonly collectionDb: CollectionDBService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Creates a new project
   * @param projectData - Project data without ID
   * @returns Created project with ID
   * @throws {Error} On validation errors or server errors
   */
  async create(projectData: CreateProjectInput): Promise<Project> {
    logger.debug('Creating project', { name: projectData.name });

    const storageData = transformProjectForStorage(projectData);

    const createdProject = await this.collectionDb.createItem<Record<string, unknown>>(
      COLLECTION_PLURAL,
      storageData
    );

    const project = transformProjectFromStorage(createdProject);

    // Invalidate cache
    this.cacheService.delete(CACHE_KEY_ALL);

    logger.info('Project created successfully', { id: project.id, name: project.name });
    return project;
  }

  /**
   * Retrieves all projects
   * @returns Array of all projects
   * @throws {Error} On server errors
   */
  async getAll(): Promise<Project[]> {
    // Check cache first
    const cached = this.cacheService.get<Project[]>(CACHE_KEY_ALL);
    if (cached) {
      return cached;
    }

    logger.debug('Fetching all projects');

    const projects = await this.collectionDb.getAllItems<Record<string, unknown>>(COLLECTION_PLURAL, {
      includeDetail: false, // Faster queries
      pageSize: 1000,
    });

    const transformedProjects = projects.map(transformProjectFromStorage);

    // Update cache
    this.cacheService.set(CACHE_KEY_ALL, transformedProjects);

    logger.info('Projects fetched successfully', { count: transformedProjects.length });
    return transformedProjects;
  }

  /**
   * Retrieves a project by ID
   * @param projectId - Project ID
   * @returns Project or null if not found
   * @throws {Error} On server errors
   */
  async getById(projectId: string): Promise<Project | null> {
    logger.debug('Fetching project by ID', { projectId });

    const project = await this.collectionDb.getItemById<Record<string, unknown>>(
      COLLECTION_SINGULAR,
      projectId
    );

    if (project) {
      logger.info('Project fetched successfully', { projectId });
      return transformProjectFromStorage(project);
    } else {
      logger.debug('Project not found', { projectId });
      return null;
    }
  }

  /**
   * Updates an existing project
   * @param projectId - Project ID
   * @param updates - Partial project updates
   * @returns Updated project
   * @throws {Error} On validation errors, not found, or server errors
   */
  async update(projectId: string, updates: UpdateProjectInput): Promise<Project> {
    logger.debug('Updating project', { projectId, updates });

    // updates doesn't contain createdBy, so no need to transform for storage
    // but we should be consistent
    const storageUpdates = transformProjectForStorage(updates as Partial<Project>);

    const updatedProject = await this.collectionDb.updateItem<Record<string, unknown>>(
      COLLECTION_SINGULAR,
      projectId,
      storageUpdates
    );

    const project = transformProjectFromStorage(updatedProject);

    // Invalidate cache
    this.cacheService.delete(CACHE_KEY_ALL);

    logger.info('Project updated successfully', { projectId });
    return project;
  }

  /**
   * Deletes a project
   * @param projectId - Project ID
   * @returns True if deleted successfully
   * @throws {Error} On not found or server errors
   */
  async delete(projectId: string): Promise<boolean> {
    logger.debug('Deleting project', { projectId });

    const deleted = await this.collectionDb.deleteItem(COLLECTION_SINGULAR, projectId);

    // Invalidate cache
    this.cacheService.delete(CACHE_KEY_ALL);

    logger.info('Project deleted successfully', { projectId });
    return deleted;
  }

  /**
   * Relation helper: Retrieves the creator (User) of a project
   * @param project - Project entity
   * @returns User who created the project, or null if not found
   * @throws {Error} On server errors
   */
  async getCreator(project: Project): Promise<User | null> {
    logger.debug('Fetching project creator', { projectId: project.id, createdBy: project.createdBy });

    // Note: This requires UserRepository to be available
    // In practice, this would be injected or accessed through the service container
    const user = await this.collectionDb.getItemById<User>('user', project.createdBy);

    if (user) {
      logger.info('Project creator fetched successfully', { projectId: project.id, userId: user.id });
    } else {
      logger.warn('Project creator not found', { projectId: project.id, createdBy: project.createdBy });
    }

    return user;
  }
}
