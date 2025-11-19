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
import { Bug } from '../models/bug';
import { User } from '../models/user';
import { logger } from '../utils/logger';

const COLLECTION_PLURAL = 'bug_tracking_commentss';
const COLLECTION_SINGULAR = 'bug_tracking_comments';

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

    const createdComment = await this.collectionDb.createItem<Comment>(
      COLLECTION_PLURAL,
      commentToCreate
    );

    logger.info('Comment created successfully', { id: createdComment.id, bugId: createdComment.bugId });
    return createdComment;
  }

  /**
   * Fetches all comments from the collection.
   *
   * @returns {Promise<Comment[]>} A promise that resolves to an array of Comment objects.
   * @throws {Error} If the database operation fails.
   */
  async getAll(): Promise<Comment[]> {
    logger.debug('Fetching all comments');

    const comments = await this.collectionDb.getAllItems<Comment>(COLLECTION_PLURAL, {
      includeDetail: false,
      pageSize: 1000,
    });

    logger.info('Comments fetched successfully', { count: comments.length });
    return comments;
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

    const comment = await this.collectionDb.getItemById<Comment>(
      COLLECTION_SINGULAR,
      commentId
    );

    if (comment) {
      logger.info('Comment fetched successfully', { commentId });
    } else {
      logger.debug('Comment not found', { commentId });
    }

    return comment;
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

    const comments = await this.collectionDb.queryItems<Comment>(
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

    logger.info('Comments fetched by bug successfully', { bugId, count: comments.length });
    return comments;
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
      const transformedBug = {
        ...bug,
        tags: transformTags(bug.tags),
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
