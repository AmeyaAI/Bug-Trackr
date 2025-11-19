/**
 * Service Container - Dependency Injection Container
 * 
 * Manages service lifecycle and provides centralized access to all services and repositories.
 * Implements singleton pattern to ensure single instance across the application.
 * 
 * Features:
 * - Lazy initialization of services
 * - Centralized configuration management
 * - Lifecycle management (initialization and cleanup)
 * - Dependency injection for repositories
 * - Logging for service operations
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { CollectionDBService } from './collectionDb';
import { UserRepository } from '../repositories/userRepository';
import { ProjectRepository } from '../repositories/projectRepository';
import { BugRepository } from '../repositories/bugRepository';
import { CommentRepository } from '../repositories/commentRepository';
import { ActivityRepository } from '../repositories/activityRepository';
import { loadConfig, AppConfig } from '../utils/config';
import { logger } from '../utils/logger';

/**
 * Service Container class that manages all application services and repositories
 * Provides dependency injection and lifecycle management
 */
export class ServiceContainer {
  private collectionDb: CollectionDBService;
  private userRepository: UserRepository;
  private projectRepository: ProjectRepository;
  private bugRepository: BugRepository;
  private commentRepository: CommentRepository;
  private activityRepository: ActivityRepository;
  private config: AppConfig;
  private isInitialized: boolean = false;

  /**
   * Creates a new ServiceContainer instance
   * Initializes Collection DB service and all repositories
   * @param config - Application configuration
   */
  constructor(config: AppConfig) {
    logger.info('Initializing ServiceContainer');
    
    this.config = config;
    
    // Initialize Collection DB service
    logger.debug('Initializing Collection DB service', {
      baseUrl: config.collectionBaseUrl,
      debug: config.debug,
    });
    
    this.collectionDb = new CollectionDBService(
      config.collectionBaseUrl,
      config.collectionApiKey
    );
    
    // Initialize repositories with Collection DB service
    logger.debug('Initializing repositories');
    
    this.userRepository = new UserRepository(this.collectionDb);
    this.projectRepository = new ProjectRepository(this.collectionDb);
    this.bugRepository = new BugRepository(this.collectionDb);
    this.commentRepository = new CommentRepository(this.collectionDb);
    this.activityRepository = new ActivityRepository(this.collectionDb);
    
    this.isInitialized = true;
    
    logger.info('ServiceContainer initialized successfully', {
      repositories: [
        'UserRepository',
        'ProjectRepository',
        'BugRepository',
        'CommentRepository',
        'ActivityRepository',
      ],
    });
  }

  /**
   * Gets the UserRepository instance
   * @returns UserRepository for user data operations
   */
  getUserRepository(): UserRepository {
    this.ensureInitialized();
    return this.userRepository;
  }

  /**
   * Gets the ProjectRepository instance
   * @returns ProjectRepository for project data operations
   */
  getProjectRepository(): ProjectRepository {
    this.ensureInitialized();
    return this.projectRepository;
  }

  /**
   * Gets the BugRepository instance
   * @returns BugRepository for bug data operations
   */
  getBugRepository(): BugRepository {
    this.ensureInitialized();
    return this.bugRepository;
  }

  /**
   * Gets the CommentRepository instance
   * @returns CommentRepository for comment data operations
   */
  getCommentRepository(): CommentRepository {
    this.ensureInitialized();
    return this.commentRepository;
  }

  /**
   * Gets the ActivityRepository instance
   * @returns ActivityRepository for activity log operations
   */
  getActivityRepository(): ActivityRepository {
    this.ensureInitialized();
    return this.activityRepository;
  }

  /**
   * Gets the Collection DB service instance
   * @returns CollectionDBService for direct database operations
   */
  getCollectionDBService(): CollectionDBService {
    this.ensureInitialized();
    return this.collectionDb;
  }

  /**
   * Gets the application configuration
   * @returns AppConfig with environment settings
   */
  getConfig(): AppConfig {
    return this.config;
  }

  /**
   * Checks if the service container is initialized
   * @returns True if initialized, false otherwise
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Ensures the service container is initialized before use
   * @throws {Error} If the service container is not initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('ServiceContainer is not initialized');
    }
  }

  /**
   * Closes all services and cleans up resources
   * Should be called during application shutdown
   * @returns Promise that resolves when cleanup is complete
   */
  async close(): Promise<void> {
    logger.info('Shutting down ServiceContainer');
    
    try {
      // Close Collection DB service
      await this.collectionDb.close();
      
      this.isInitialized = false;
      
      logger.info('ServiceContainer shutdown complete');
    } catch (error) {
      logger.error('Error during ServiceContainer shutdown', { error });
      throw error;
    }
  }
}

/**
 * Singleton instance of the ServiceContainer
 * Ensures only one instance exists across the application
 */
let serviceContainerInstance: ServiceContainer | null = null;

/**
 * Gets the singleton ServiceContainer instance
 * Creates a new instance if one doesn't exist
 * Uses configuration from environment variables
 * 
 * @returns ServiceContainer singleton instance
 * @throws {Error} If required environment variables are missing
 * 
 * @example
 * // In an API route
 * const services = getServiceContainer();
 * const users = await services.getUserRepository().getAll();
 * 
 * @example
 * // In a Next.js API handler
 * export default async function handler(req, res) {
 *   const services = getServiceContainer();
 *   const bugRepo = services.getBugRepository();
 *   const bugs = await bugRepo.getAll();
 *   res.json(bugs);
 * }
 */
export function getServiceContainer(): ServiceContainer {
  if (!serviceContainerInstance) {
    logger.debug('Creating new ServiceContainer instance');
    
    // Load configuration from environment variables
    const config = loadConfig();
    
    // Create new service container
    serviceContainerInstance = new ServiceContainer(config);
  }
  
  return serviceContainerInstance;
}

/**
 * Resets the singleton ServiceContainer instance
 * Useful for testing or when configuration changes
 * Closes the existing instance before resetting
 * 
 * @returns Promise that resolves when reset is complete
 * 
 * @example
 * // In tests
 * afterEach(async () => {
 *   await resetServiceContainer();
 * });
 */
export async function resetServiceContainer(): Promise<void> {
  if (serviceContainerInstance) {
    logger.debug('Resetting ServiceContainer instance');
    
    try {
      await serviceContainerInstance.close();
    } catch (error) {
      logger.warn('Error closing ServiceContainer during reset', { error });
    }
    
    serviceContainerInstance = null;
    logger.debug('ServiceContainer instance reset complete');
  }
}

/**
 * Checks if the ServiceContainer is initialized
 * @returns True if initialized, false otherwise
 * 
 * @example
 * if (isServiceContainerInitialized()) {
 *   const services = getServiceContainer();
 * }
 */
export function isServiceContainerInitialized(): boolean {
  return serviceContainerInstance !== null && serviceContainerInstance.isReady();
}
