/**
 * Comment Management API Routes
 * 
 * Handles comment listing and creation operations.
 * 
 * GET /api/comments - List all comments with optional filtering by bug
 * POST /api/comments - Create a new comment
 * 
 * Requirements: 2.5, 3.5, 3.6
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { createCommentSchema } from '@/lib/utils/validation';
import { ActivityAction } from '@/lib/models/activity';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/comments - List all comments with optional filtering
 * 
 * Query Parameters:
 * - bugId: Filter comments by bug ID (optional)
 * 
 * Returns: Array of comment objects
 * Status Codes: 200 (success), 500 (server error)
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const services = getServiceContainer();
    const commentRepo = services.getCommentRepository();
    
    const { bugId } = req.query;
    
    // Validate query parameter type
    if (bugId !== undefined && typeof bugId !== 'string') {
      return res.status(400).json({
        error: 'Invalid query parameter',
        details: 'bugId must be a single string value',
      });
    }
    
    let comments;
    
    // Apply filter if bugId is provided
    if (bugId) {
      logger.debug('Fetching comments by bug', { bugId });
      comments = await commentRepo.getByBug(bugId);
    } else {
      logger.debug('Fetching all comments');
      comments = await commentRepo.getAll();
    }
    
    logger.info('Comments fetched successfully', { count: comments.length });
    return res.status(200).json(comments);
    
  } catch (error) {
    logger.error('Error fetching comments', { error });
    return res.status(500).json({
      error: 'Failed to fetch comments',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/comments - Create a new comment
 * 
 * Request Body:
 * - bugId: Bug ID (required)
 * - authorId: Author user ID (required)
 * - message: Comment message (required, max 2000 chars)
 * 
 * Returns: Created comment object with 201 status
 * Status Codes: 201 (created), 400 (validation error), 404 (bug/user not found), 500 (server error)
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const services = getServiceContainer();
    const commentRepo = services.getCommentRepository();
    const bugRepo = services.getBugRepository();
    const userRepo = services.getUserRepository();
    const activityRepo = services.getActivityRepository();
    
    // Validate request body
    const body = createCommentSchema.parse(req.body);
    
    // Verify bug and author exist in parallel
    logger.debug('Verifying bug and author exist', { bugId: body.bugId, authorId: body.authorId });
    const [bug, author] = await Promise.all([
      bugRepo.getById(body.bugId),
      userRepo.getById(body.authorId)
    ]);

    if (!bug) {
      logger.warn('Bug not found', { bugId: body.bugId });
      return res.status(404).json({
        error: 'Bug not found',
        details: `Bug with ID ${body.bugId} does not exist`,
      });
    }
    
    if (!author) {
      logger.warn('Author user not found', { authorId: body.authorId });
      return res.status(404).json({
        error: 'Author user not found',
        details: `User with ID ${body.authorId} does not exist`,
      });
    }
    
    // Create comment and log activity in parallel for performance
    // This reduces total latency by running the two write operations concurrently
    logger.debug('Creating comment and activity log in parallel');
    
    const [comment] = await Promise.all([
      commentRepo.create({
        bugId: body.bugId,
        authorId: body.authorId,
        message: body.message,
      }),
      activityRepo.create({
        bugId: body.bugId,
        action: ActivityAction.COMMENTED,
        authorId: body.authorId,
      })
    ]);
    
    logger.info('Comment created successfully', { commentId: comment.id, bugId: body.bugId });
    return res.status(201).json(comment);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Comment validation failed', { errors: error.issues });
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues,
      });
    }
    
    logger.error('Error creating comment', { error });
    return res.status(500).json({
      error: 'Failed to create comment',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Main API route handler
 * Routes requests to appropriate handler based on HTTP method
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  
  if (req.method === 'POST') {
    return handlePost(req, res);
  }
  
  return res.status(405).json({
    error: 'Method not allowed',
    details: `HTTP method ${req.method} is not supported for this endpoint`,
  });
}
