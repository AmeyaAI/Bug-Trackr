/**
 * User Repository - Data access layer for User entities
 * 
 * Handles all CRUD operations for users in the Collection DB.
 * Provides field transformation between snake_case (Collection DB) and camelCase (TypeScript).
 * 
 * Collection Names:
 * - Users: 'users' / 'user'
 * - Groups: 'groups' / 'group'
 * - Group Members: 'group_members' / 'group_member'
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { CollectionDBService } from '../services/collectionDb';
import { CacheService } from '../services/cacheService';
import { User, CreateUserInput, UpdateUserInput, UserRole } from '../models/user';
import { logger } from '../utils/logger';

const COLLECTION_USERS_PLURAL = 'users';
const COLLECTION_USERS_SINGULAR = 'user';
const COLLECTION_GROUPS_PLURAL = 'groups';
const COLLECTION_GROUP_MEMBERS_PLURAL = 'group_members';


const CACHE_KEY_ALL = 'users:all';
const ORG_ID = '424e744f-94a5-4aae-b1ae-f24719f1a426';

// Internal interfaces for DB schema
interface DbUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  groupMembers: string[];
  organizations: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface DbGroup {
  id: string;
  name: string;
  description: string;
  groupMembers: string[];
  organizations: string[];
  isActive: boolean;
}

interface DbGroupMember {
  id: string;
  user: string[];
  group: string[];
  isActive: boolean;
}

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
    // TODO: Update for new schema if needed
    logger.debug('Creating user', { email: userData.email });

    const now = new Date();
    const userToCreate = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    };

    const createdUser = await this.collectionDb.createItem<User>(
      COLLECTION_USERS_PLURAL,
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

    // Note: This fetches raw users without resolving roles correctly for now
    // To fully resolve roles, we'd need to fetch groups/members for each user
    const dbUsers = await this.collectionDb.getAllItems<DbUser>(COLLECTION_USERS_PLURAL, {
      includeDetail: false, // Faster queries
      pageSize: 1000,
    });

    const users = dbUsers.map(u => this.mapToUser(u, UserRole.TESTER)); // Defaulting to Tester for list view for now

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

    const dbUser = await this.collectionDb.getItemById<DbUser>(COLLECTION_USERS_SINGULAR, userId);

    if (dbUser) {
      try {
        const user = await this.resolveUserRoles(dbUser);
        this.cacheService.set(cacheKey, user);
        logger.info('User fetched successfully', { userId, role: user.role });
        return user;
      } catch (error) {
        logger.error('Error resolving roles in getById', { error, userId });
        const user = this.mapToUser(dbUser, UserRole.TESTER);
        return user;
      }
    } else {
      logger.debug('User not found', { userId });
      return null;
    }
  }

  /**
   * Retrieves a user by email address
   * Uses filter query for optimized retrieval and resolves role via Group Members -> Groups
   * @param email - User email address
   * @returns User or null if not found
   * @throws {Error} On server errors
   */
  async getByEmail(email: string): Promise<User | null> {
    logger.debug('Fetching user by email', { email });

    // 1. Fetch User
    const users = await this.collectionDb.queryItems<DbUser>(
      COLLECTION_USERS_PLURAL,
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

    const dbUser = users.length > 0 ? users[0] : null;

    if (!dbUser) {
      logger.debug('User not found by email', { email });
      return null;
    }

    try {
        const user = await this.resolveUserRoles(dbUser);
        logger.info('User fetched by email successfully', { email, userId: user.id, role: user.role });
        return user;

    } catch (error) {
        logger.error('Error resolving user role', { error, userId: dbUser.id });
        // Fallback to basic user with default role
        return this.mapToUser(dbUser, UserRole.TESTER, [UserRole.TESTER]);
    }
  }

  private async resolveUserRoles(dbUser: DbUser): Promise<User> {
        // 2. Fetch Group Members using user_id (UUID) from payload
        // The user_id in payload is the UUID from Auth provider (JWT)
       const userIdUUID = dbUser.userId; 

        if (!userIdUUID) {
             logger.warn('User has no userId (UUID)', { userId: dbUser.id });
             return this.mapToUser(dbUser, UserRole.TESTER);
        }

        const groupMembers = await this.collectionDb.queryItems<DbGroupMember>(
            COLLECTION_GROUP_MEMBERS_PLURAL,
            [{ field_name: 'payload.user', field_value: dbUser.id, operator: 'like' }],
            { includeDetail: false }
        );

        logger.debug('Fetched group members', { count: groupMembers.length });

        if (groupMembers.length === 0) {
            logger.warn('User has no group members found via query', { userId: dbUser.id, uuid: userIdUUID });
            return this.mapToUser(dbUser, UserRole.TESTER);
        }

        // 3. Get Group IDs
        const groupIds = groupMembers.flatMap(gm => gm.group || []);
        logger.debug('Extracted group IDs', { groupIds });
        
        if (groupIds.length === 0) {
            return this.mapToUser(dbUser, UserRole.TESTER);
        }

        // 4. Fetch Groups filtered by Organization
        const orgGroups = await this.collectionDb.queryItems<DbGroup>(
            COLLECTION_GROUPS_PLURAL,
            [{ field_name: 'payload.organizations', field_value: ORG_ID, operator: 'like' }],
            { includeDetail: false }
        );

        logger.debug('Fetched org groups', { count: orgGroups.length });

        // Find all matching groups
        const userGroups = orgGroups.filter(g => groupIds.includes(g.id));
        logger.debug('Matched user groups', { count: userGroups.length, groups: userGroups.map(g => g.name) });

        const roles = new Set<UserRole>();
        if (userGroups.length > 0) {
            userGroups.forEach(g => roles.add(this.mapGroupNameToRole(g.name)));
        } else {
            logger.warn('User not in any group for the organization', { userId: dbUser.id, orgId: ORG_ID });
            roles.add(UserRole.TESTER);
        }

        const availableRoles = Array.from(roles);
        // Default to the "highest" role or just the first one. 
        // Priority: Admin > Developer > Tester
        let primaryRole = UserRole.TESTER;
        if (roles.has(UserRole.ADMIN)) primaryRole = UserRole.ADMIN;
        else if (roles.has(UserRole.DEVELOPER)) primaryRole = UserRole.DEVELOPER;
        else if (roles.has(UserRole.TESTER)) primaryRole = UserRole.TESTER;

        return this.mapToUser(dbUser, primaryRole, availableRoles);
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
      COLLECTION_USERS_SINGULAR,
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

    const deleted = await this.collectionDb.deleteItem(COLLECTION_USERS_SINGULAR, userId);

    // Invalidate cache
    this.cacheService.delete(CACHE_KEY_ALL);

    logger.info('User deleted successfully', { userId });
    return deleted;
  }

  private mapGroupNameToRole(groupName: string): UserRole {
      const name = groupName.toLowerCase();
      if (name.includes('admin')) return UserRole.ADMIN;
      if (name.includes('developer')) return UserRole.DEVELOPER;
      if (name.includes('tester')) return UserRole.TESTER;
      return UserRole.TESTER;
  }

  private mapToUser(dbUser: DbUser, role: UserRole, availableRoles: UserRole[] = []): User {
      return {
          id: dbUser.id,
          userId: dbUser.userId,
          name: dbUser.name,
          email: dbUser.email,
          role: role,
          availableRoles: availableRoles.length > 0 ? availableRoles : [role],
          createdAt: new Date(dbUser.createdAt),
          updatedAt: new Date(dbUser.updatedAt)
      };
  }
}
