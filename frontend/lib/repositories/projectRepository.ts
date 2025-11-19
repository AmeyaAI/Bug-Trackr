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
import { Project, CreateProjectInput, UpdateProjectInput } from '../models/project';
import { User } from '../models/user';
import { logger } from '../utils/logger';

const COLLECTION_PLURAL = 'bug_tracking_projects';
const COLLECTION_SINGULAR = 'bug_tracking_project';

export class ProjectRepository {
  constructor(private readonly collectionDb: CollectionDBService) {}

  /**
   * Creates a new project
   * @param projectData - Project data without ID
   * @returns Created project with ID
   * @throws {Error} On validation errors or server errors
   */
  async create(projectData: CreateProjectInput): Promise<Project> {
    logger.debug('Creating project', { name: projectData.name });

    const createdProject = await this.collectionDb.createItem<Project>(
      COLLECTION_PLURAL,
      projectData
    );

    logger.info('Project created successfully', { id: createdProject.id, name: createdProject.name });
    return createdProject;
  }

  /**
   * Retrieves all projects
   * @returns Array of all projects
   * @throws {Error} On server errors
   */
  async getAll(): Promise<Project[]> {
    logger.debug('Fetching all projects');

    const projects = await this.collectionDb.getAllItems<Project>(COLLECTION_PLURAL, {
      includeDetail: false, // Faster queries
      pageSize: 1000,
    });

    logger.info('Projects fetched successfully', { count: projects.length });
    return projects;
  }

  /**
   * Retrieves a project by ID
   * @param projectId - Project ID
   * @returns Project or null if not found
   * @throws {Error} On server errors
   */
  async getById(projectId: string): Promise<Project | null> {
    logger.debug('Fetching project by ID', { projectId });

    const project = await this.collectionDb.getItemById<Project>(
      COLLECTION_SINGULAR,
      projectId
    );

    if (project) {
      logger.info('Project fetched successfully', { projectId });
    } else {
      logger.debug('Project not found', { projectId });
    }

    return project;
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

    const updatedProject = await this.collectionDb.updateItem<Project>(
      COLLECTION_SINGULAR,
      projectId,
      updates
    );

    logger.info('Project updated successfully', { projectId });
    return updatedProject;
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
