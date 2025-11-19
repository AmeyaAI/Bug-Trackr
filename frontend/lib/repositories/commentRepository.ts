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

  async getAll(): Promise<Comment[]> {
    logger.debug('Fetching all comments');

    const comments = await this.collectionDb.getAllItems<Comment>(COLLECTION_PLURAL, {
      includeDetail: false,
      pageSize: 1000,
    });

    logger.info('Comments fetched successfully', { count: comments.length });
    return comments;
  }

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

  async delete(commentId: string): Promise<boolean> {
    logger.debug('Deleting comment', { commentId });

    const deleted = await this.collectionDb.deleteItem(COLLECTION_SINGULAR, commentId);

    logger.info('Comment deleted successfully', { commentId });
    return deleted;
  }

  async getBug(comment: Comment): Promise<Bug | null> {
    logger.debug('Fetching comment bug', { commentId: comment.id, bugId: comment.bugId });

    const bug = await this.collectionDb.getItemById<Record<string, unknown>>(
      'bug_tracking_bugs',
      comment.bugId
    );

    if (bug) {
      const transformedBug = {
        ...bug,
        tags: typeof bug.tags === 'string' 
          ? (bug.tags as string).split(',').map(t => t.trim())
          : [],
      } as Bug;
      
      logger.info('Comment bug fetched successfully', { commentId: comment.id, bugId: transformedBug.id });
      return transformedBug;
    } else {
      logger.warn('Comment bug not found', { commentId: comment.id, bugId: comment.bugId });
      return null;
    }
  }

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
