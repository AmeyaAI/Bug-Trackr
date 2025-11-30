/**
 * User Repository - Data access layer for User entities
 * 
 * Handles all CRUD operations for users in the Collection DB.
 * Provides field transformation between snake_case (Collection DB) and camelCase (TypeScript).
 * 
 * Collection Names:
 * - Plural (list operations): 'users'
 * - Singular (item operations): 'user'
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { CollectionDBService } from '../services/collectionDb';
import { CacheService } from '../services/cacheService';
import { User, CreateUserInput, UpdateUserInput } from '../models/user';
import { logger } from '../utils/logger';

const COLLECTION_PLURAL = 'users';
const COLLECTION_SINGULAR = 'user';
const CACHE_KEY_ALL = 'users:all';

export class UserRepository {
  constructor(
    private readonly collectionDb: CollectionDBService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Creates a new user
   * @param userData - User data without ID and timestamps
   * @returns Created user with ID and timestamps
   * @throws {Error} On validation errors or server errors
   */
  async create(userData: CreateUserInput): Promise<User> {
    logger.debug('Creating user', { email: userData.email });

    const now = new Date();
    const userToCreate = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    };

    const createdUser = await this.collectionDb.createItem<User>(
      COLLECTION_PLURAL,
      userToCreate
    );

    // Invalidate cache
    this.cacheService.delete(CACHE_KEY_ALL);

    logger.info('User created successfully', { id: createdUser.id, email: createdUser.email });
    return createdUser;
  }

  /**
   * Retrieves all users
   * @returns Array of all users
   * @throws {Error} On server errors
   */
  async getAll(): Promise<User[]> {
    // Check cache first
    const cached = this.cacheService.get<User[]>(CACHE_KEY_ALL);
    if (cached) {
      return cached;
    }

    logger.debug('Fetching all users');

    const users = await this.collectionDb.getAllItems<User>(COLLECTION_PLURAL, {
      includeDetail: false, // Faster queries
      pageSize: 1000,
    });

    // Update cache
    this.cacheService.set(CACHE_KEY_ALL, users);
    
    // Also populate individual user cache to speed up getById calls
    users.forEach(user => {
      this.cacheService.set(`user:${user.id}`, user);
    });

    logger.info('Users fetched successfully', { count: users.length });
    return users;
  }

  /**
   * Retrieves a user by ID
   * @param userId - User ID
   * @returns User or null if not found
   * @throws {Error} On server errors
   */
  async getById(userId: string): Promise<User | null> {
    const cacheKey = `user:${userId}`;
    const cached = this.cacheService.get<User>(cacheKey);
    if (cached) {
      logger.debug('Returning cached user', { userId });
      return cached;
    }

    logger.debug('Fetching user by ID', { userId });

    const user = await this.collectionDb.getItemById<User>(COLLECTION_SINGULAR, userId);

    if (user) {
      this.cacheService.set(cacheKey, user);
      logger.info('User fetched successfully', { userId });
    } else {
      logger.debug('User not found', { userId });
    }

    return user;
  }

  /**
   * Retrieves a user by email address
   * Uses filter query for optimized retrieval
   * @param email - User email address
   * @returns User or null if not found
   * @throws {Error} On server errors
   */
  async getByEmail(email: string): Promise<User | null> {
    logger.debug('Fetching user by email', { email });

    const users = await this.collectionDb.queryItems<User>(
      COLLECTION_PLURAL,
      [
        {
          field_name: 'payload.email',
          field_value: email,
          operator: 'eq',
        },
      ],
      {
        includeDetail: false,
        pageSize: 1, // We only expect one result
      }
    );

    const user = users.length > 0 ? users[0] : null;

    if (user) {
      logger.info('User fetched by email successfully', { email, userId: user.id });
    } else {
      logger.debug('User not found by email', { email });
    }

    return user;
  }

  /**
   * Updates an existing user
   * @param userId - User ID
   * @param updates - Partial user updates
   * @returns Updated user
   * @throws {Error} On validation errors, not found, or server errors
   */
  async update(userId: string, updates: UpdateUserInput): Promise<User> {
    logger.debug('Updating user', { userId, updates });

    const updatedUser = await this.collectionDb.updateItem<User>(
      COLLECTION_SINGULAR,
      userId,
      {
        ...updates,
        updatedAt: new Date(),
      }
    );

    // Invalidate cache
    this.cacheService.delete(CACHE_KEY_ALL);

    logger.info('User updated successfully', { userId });
    return updatedUser;
  }

  /**
   * Deletes a user
   * @param userId - User ID
   * @returns True if deleted successfully
   * @throws {Error} On not found or server errors
   */
  async delete(userId: string): Promise<boolean> {
    logger.debug('Deleting user', { userId });

    const deleted = await this.collectionDb.deleteItem(COLLECTION_SINGULAR, userId);

    // Invalidate cache
    this.cacheService.delete(CACHE_KEY_ALL);

    logger.info('User deleted successfully', { userId });
    return deleted;
  }
}
