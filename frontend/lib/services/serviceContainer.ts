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
import { SprintRepository } from '../repositories/sprintRepository';
import { CommentRepository } from '../repositories/commentRepository';
import { ActivityRepository } from '../repositories/activityRepository';
import { loadConfig, AppConfig } from '../utils/config';
import { logger } from '../utils/logger';

/**
 * Service Container class that manages all application services and repositories
 * Provides dependency injection and lifecycle management with lazy initialization
 */
export class ServiceContainer {
  private collectionDb: CollectionDBService | null = null;
  private userRepository: UserRepository | null = null;
  private projectRepository: ProjectRepository | null = null;
  private bugRepository: BugRepository | null = null;
  private sprintRepository: SprintRepository | null = null;
  private commentRepository: CommentRepository | null = null;
  private activityRepository: ActivityRepository | null = null;
  private config: AppConfig;
  private isActive: boolean = true;

  /**
   * Creates a new ServiceContainer instance
   * Services and repositories are lazily initialized on first access
   * @param config - Application configuration
   */
  constructor(config: AppConfig) {
    logger.info('ServiceContainer created (services will be lazily initialized)');
    this.config = config;
  }

  /**
   * Lazily initializes the Collection DB service
   * @returns CollectionDBService instance
   */
  private initializeCollectionDB(): CollectionDBService {
    if (!this.collectionDb) {
      logger.debug('Lazy initializing Collection DB service', {
        baseUrl: this.config.collectionBaseUrl,
        debug: this.config.debug,
      });
      
      this.collectionDb = new CollectionDBService(
        this.config.collectionBaseUrl,
        this.config.collectionApiKey
      );
    }
    return this.collectionDb;
  }

  /**
   * Gets the UserRepository instance (lazy initialization)
   * @returns UserRepository for user data operations
   */
  getUserRepository(): UserRepository {
    this.ensureActive();
    if (!this.userRepository) {
      logger.debug('Lazy initializing UserRepository');
      this.userRepository = new UserRepository(this.initializeCollectionDB());
    }
    return this.userRepository;
  }

  /**
   * Gets the ProjectRepository instance (lazy initialization)
   * @returns ProjectRepository for project data operations
   */
  getProjectRepository(): ProjectRepository {
    this.ensureActive();
    if (!this.projectRepository) {
      logger.debug('Lazy initializing ProjectRepository');
      this.projectRepository = new ProjectRepository(this.initializeCollectionDB());
    }
    return this.projectRepository;
  }

  /**
   * Gets the BugRepository instance (lazy initialization)
   * @returns BugRepository for bug data operations
   */
  getBugRepository(): BugRepository {
    this.ensureActive();
    if (!this.bugRepository) {
      logger.debug('Lazy initializing BugRepository');
      this.bugRepository = new BugRepository(this.initializeCollectionDB());
    }
    return this.bugRepository;
  }

  /**
   * Gets the SprintRepository instance (lazy initialization)
   * @returns SprintRepository for sprint data operations
   */
  getSprintRepository(): SprintRepository {
    this.ensureActive();
    if (!this.sprintRepository) {
      logger.debug('Lazy initializing SprintRepository');
      this.sprintRepository = new SprintRepository(this.initializeCollectionDB());
    }
    return this.sprintRepository;
  }

  /**
   * Gets the CommentRepository instance (lazy initialization)
   * @returns CommentRepository for comment data operations
   */
  getCommentRepository(): CommentRepository {
    this.ensureActive();
    if (!this.commentRepository) {
      logger.debug('Lazy initializing CommentRepository');
      this.commentRepository = new CommentRepository(this.initializeCollectionDB());
    }
    return this.commentRepository;
  }

  /**
   * Gets the ActivityRepository instance (lazy initialization)
   * @returns ActivityRepository for activity log operations
   */
  getActivityRepository(): ActivityRepository {
    this.ensureActive();
    if (!this.activityRepository) {
      logger.debug('Lazy initializing ActivityRepository');
      this.activityRepository = new ActivityRepository(this.initializeCollectionDB());
    }
    return this.activityRepository;
  }

  /**
   * Gets the Collection DB service instance (lazy initialization)
   * @returns CollectionDBService for direct database operations
   */
  getCollectionDBService(): CollectionDBService {
    this.ensureActive();
    return this.initializeCollectionDB();
  }

  /**
   * Gets the application configuration
   * @returns AppConfig with environment settings
   */
  getConfig(): AppConfig {
    return this.config;
  }

  /**
   * Checks if the service container is active and ready to use
   * @returns True if active, false if closed
   */
  isReady(): boolean {
    return this.isActive;
  }

  /**
   * Ensures the service container is active before use
   * @throws {Error} If the service container has been closed
   */
  private ensureActive(): void {
    if (!this.isActive) {
      throw new Error('ServiceContainer has been closed and cannot be used');
    }
  }

  /**
   * Closes all services and cleans up resources
   * Should be called during application shutdown
   * After calling close(), the container cannot be used anymore
   * @returns Promise that resolves when cleanup is complete
   */
  async close(): Promise<void> {
    if (!this.isActive) {
      logger.warn('ServiceContainer is already closed');
      return;
    }

    logger.info('Shutting down ServiceContainer');
    
    try {
      // Close Collection DB service if it was initialized
      if (this.collectionDb) {
        await this.collectionDb.close();
      }
      
      // Clear all repository references
      this.userRepository = null;
      this.projectRepository = null;
      this.bugRepository = null;
      this.sprintRepository = null;
      this.commentRepository = null;
      this.activityRepository = null;
      this.collectionDb = null;
      
      // Mark container as inactive
      this.isActive = false;
      
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
 * Tracks initialization errors to prevent repeated failed attempts
 * If initialization fails once, subsequent calls will immediately throw
 * the cached error instead of retrying
 */
let initializationError: Error | null = null;

/**
 * Gets the singleton ServiceContainer instance
 * Creates a new instance if one doesn't exist
 * Uses configuration from environment variables
 * 
 * @returns ServiceContainer singleton instance
 * @throws {Error} If required environment variables are missing or initialization failed previously
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
  // If initialization failed previously, throw immediately with context
  if (initializationError) {
    logger.error('ServiceContainer initialization failed previously, not retrying', {
      originalError: initializationError.message,
    });
    throw new Error(
      `ServiceContainer failed to initialize previously: ${initializationError.message}`,
      { cause: initializationError }
    );
  }

  if (!serviceContainerInstance) {
    try {
      logger.debug('Creating new ServiceContainer instance');
      
      // Load configuration from environment variables
      const config = loadConfig();
      
      // Create new service container
      serviceContainerInstance = new ServiceContainer(config);
      
      // Clear any previous error on successful initialization
      initializationError = null;
    } catch (error) {
      // Cache the error to prevent repeated initialization attempts
      initializationError = error as Error;
      
      logger.error('ServiceContainer initialization failed', {
        error: initializationError.message,
      });
      
      // Re-throw the original error
      throw error;
    }
  }
  
  return serviceContainerInstance;
}

/**
 * Resets the singleton ServiceContainer instance
 * Useful for testing or when configuration changes
 * Closes the existing instance before resetting
 * Also clears any cached initialization errors
 * 
 * @returns Promise that resolves when reset is complete
 * 
 * @example
 * // In tests
 * afterEach(async () => {
 *   await resetServiceContainer();
 * });
 * 
 * @example
 * // Retry after fixing configuration
 * await resetServiceContainer();
 * const services = getServiceContainer(); // Will retry initialization
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
  
  // Clear any cached initialization error to allow retry
  if (initializationError) {
    logger.debug('Clearing cached initialization error');
    initializationError = null;
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

/**
 * Gets the cached initialization error if one exists
 * Useful for diagnostics and error reporting
 * 
 * @returns The initialization error or null if no error occurred
 * 
 * @example
 * const error = getInitializationError();
 * if (error) {
 *   console.error('ServiceContainer failed to initialize:', error.message);
 *   // Maybe show a helpful error page to the user
 * }
 */
export function getInitializationError(): Error | null {
  return initializationError;
}
