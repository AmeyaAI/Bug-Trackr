/**
 * Comment Repository - Data access layer for Comment entities
 * 
 * Handles all CRUD operations for comments in the Collection DB.
 * Provides filter query optimization for fetching comments by bug.
 * Provides relation helper methods to fetch related entities.
 * 
 * Collection Names:
 * - Plural (list operations): 'bug_tracking_commentss'
 * - Singular (item operations): 'bug_tracking_comments'
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.6
 */

import { CollectionDBService } from '../services/collectionDb';
import { Comment, CreateCommentInput } from '../models/comment';
import { Bug, BugTag } from '../models/bug';
import { User } from '../models/user';
import { logger } from '../utils/logger';
import { tagsFromString } from '../utils/transformers';

const COLLECTION_PLURAL = 'bug_tracking_commentss';
const COLLECTION_SINGULAR = 'bug_tracking_comments';

/**
 * Transforms comment data for Collection DB storage
 * Ensures relational fields are stored as arrays
 */
function transformCommentForStorage(comment: Partial<Comment>): Record<string, unknown> {
  const { bugId, authorId, ...rest } = comment;
  
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
 * Transforms comment data from Collection DB
 * Extracts relational fields from arrays to single values
 * Handles both camelCase and snake_case keys for robustness
 */
function transformCommentFromStorage(comment: Record<string, unknown>): Comment {
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
      } catch (e) {
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

  const id = (comment.id || comment._id || comment.__auto_id__) as string;
  const message = (comment.message || '') as string;
  
  const bugIdRaw = comment.bugId || comment.bug_id;
  const authorIdRaw = comment.authorId || comment.author_id;
  
  const bugId = extractSingle(bugIdRaw) as string;
  const authorId = extractSingle(authorIdRaw) as string;
  
  const createdAtRaw = comment.createdAt || comment.created_at || comment.created;
  const createdAt = parseDate(createdAtRaw);

  return {
    id,
    bugId,
    authorId,
    message,
    createdAt,
  };
}

export class CommentRepository {
  constructor(private readonly collectionDb: CollectionDBService) {}

  /**
   * Creates a new comment in the collection database.
   *
   * @param {CreateCommentInput} commentData - The data for the comment to create.
   * @returns {Promise<Comment>} The created comment.
   * @throws {Error} If the comment could not be created.
   */
  async create(commentData: CreateCommentInput): Promise<Comment> {
    logger.debug('Creating comment', { bugId: commentData.bugId, authorId: commentData.authorId });

    const commentToCreate = {
      ...commentData,
      createdAt: new Date(),
    };

    const storageData = transformCommentForStorage(commentToCreate);

    const createdComment = await this.collectionDb.createItem<Record<string, unknown>>(
      COLLECTION_PLURAL,
      storageData
    );

    const comment = transformCommentFromStorage(createdComment);

    logger.info('Comment created successfully', { id: comment.id, bugId: comment.bugId });
    return comment;
  }

  /**
   * Fetches all comments from the collection.
   *
   * @returns {Promise<Comment[]>} A promise that resolves to an array of Comment objects.
   * @throws {Error} If the database operation fails.
   */
  async getAll(): Promise<Comment[]> {
    logger.debug('Fetching all comments');

    const comments = await this.collectionDb.getAllItems<Record<string, unknown>>(COLLECTION_PLURAL, {
      includeDetail: false,
      pageSize: 1000,
    });

    const transformedComments = comments.map(transformCommentFromStorage);

    logger.info('Comments fetched successfully', { count: transformedComments.length });
    return transformedComments;
  }

  /**
   * Fetches a comment by its unique identifier.
   *
   * @param {string} commentId - The unique identifier of the comment to fetch.
   * @returns {Promise<Comment | null>} The comment if found, or null if not found.
   * @throws {Error} If the underlying database service throws an error.
   */
  async getById(commentId: string): Promise<Comment | null> {
    logger.debug('Fetching comment by ID', { commentId });

    const comment = await this.collectionDb.getItemById<Record<string, unknown>>(
      COLLECTION_SINGULAR,
      commentId
    );

    if (comment) {
      logger.info('Comment fetched successfully', { commentId });
      return transformCommentFromStorage(comment);
    } else {
      logger.debug('Comment not found', { commentId });
      return null;
    }
  }

  /**
   * Fetches all comments associated with a specific bug.
   * 
   * @param {string} bugId - The ID of the bug to fetch comments for.
   * @returns {Promise<Comment[]>} A promise that resolves to an array of comments for the given bug.
   * @throws {Error} If the database query fails.
   */
  async getByBug(bugId: string): Promise<Comment[]> {
    logger.debug('Fetching comments by bug', { bugId });

    const comments = await this.collectionDb.queryItems<Record<string, unknown>>(
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

    const transformedComments = comments.map(transformCommentFromStorage);

    logger.info('Comments fetched by bug successfully', { bugId, count: transformedComments.length });
    return transformedComments;
  }

  /**
   * Deletes a comment by its ID.
   *
   * @param {string} commentId - The ID of the comment to delete.
   * @returns {Promise<boolean>} True if the comment was deleted successfully, false otherwise.
   * @throws {Error} If the deletion fails due to a database error.
   */
  async delete(commentId: string): Promise<boolean> {
    logger.debug('Deleting comment', { commentId });

    const deleted = await this.collectionDb.deleteItem(COLLECTION_SINGULAR, commentId);

    logger.info('Comment deleted successfully', { commentId });
    return deleted;
  }

  /**
   * Retrieves the bug associated with the given comment.
   *
   * @param {Comment} comment - The comment whose related bug is to be fetched.
   * @returns {Promise<Bug | null>} The associated bug if found, otherwise null.
   * @throws {Error} If the underlying database service fails.
   */
  async getBug(comment: Comment): Promise<Bug | null> {
    logger.debug('Fetching comment bug', { commentId: comment.id, bugId: comment.bugId });

    const bug = await this.collectionDb.getItemById<Record<string, unknown>>(
      'bug_tracking_bugs',
      comment.bugId
    );

    if (bug) {
      // Manually transform bug here since we don't have access to BugRepository's transformer
      const tags = bug.tags;
      const projectId = bug.projectId || bug.project_id;
      const reportedBy = bug.reportedBy || bug.reported_by;
      const assignedTo = bug.assignedTo || bug.assigned_to;
      
      const { 
        tags: _t, 
        projectId: _p, project_id: _pid, 
        reportedBy: _r, reported_by: _rid, 
        assignedTo: _a, assigned_to: _aid, 
        ...rest 
      } = bug;

      const transformedBug = {
        ...rest,
        projectId: Array.isArray(projectId) ? (projectId.length > 0 ? projectId[0] : undefined) : projectId,
        reportedBy: Array.isArray(reportedBy) ? (reportedBy.length > 0 ? reportedBy[0] : undefined) : reportedBy,
        assignedTo: Array.isArray(assignedTo) ? (assignedTo.length > 0 ? assignedTo[0] : undefined) : assignedTo,
        tags: typeof tags === 'string' ? tagsFromString(tags) : [],
      } as Bug;
      
      logger.info('Comment bug fetched successfully', { commentId: comment.id, bugId: transformedBug.id });
      return transformedBug;
    } else {
      logger.warn('Comment bug not found', { commentId: comment.id, bugId: comment.bugId });
      return null;
    }
  }

  /**
   * Fetches the author (user) of a given comment.
   *
   * @param {Comment} comment - The comment whose author is to be retrieved.
   * @returns {Promise<User | null>} The user who authored the comment, or null if not found.
   * @throws {Error} If there is a problem accessing the database.
   */
  async getAuthor(comment: Comment): Promise<User | null> {
    logger.debug('Fetching comment author', { commentId: comment.id, authorId: comment.authorId });

    const user = await this.collectionDb.getItemById<User>('user', comment.authorId);

    if (user) {
      logger.info('Comment author fetched successfully', { commentId: comment.id, userId: user.id });
    } else {
      logger.warn('Comment author not found', { commentId: comment.id, authorId: comment.authorId });
    }

    return user;
  }
}
