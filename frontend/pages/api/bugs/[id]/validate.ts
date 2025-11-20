/**
 * Bug Validation API Route
 * 
 * Handles bug validation operations (tester-only).
 * 
 * PATCH /api/bugs/[id]/validate - Validate a bug
 * 
 * Requirements: 3.1, 3.2
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { UserRole } from '@/lib/models/user';
import { logger } from '@/lib/utils/logger';
import { ActivityAction } from '@/lib/models/activity';

/**
 * Validation schema for bug validation request
 */
const validateBugSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  userRole: z.nativeEnum(UserRole, { 
    message: 'Invalid user role'
  }),
});

/**
 * PATCH /api/bugs/[id]/validate - Validate a bug
 * 
 * Request Body:
 * - userId: User performing the validation (required)
 * - userRole: Role of the user (required, must be 'tester' or 'admin')
 * 
 * Authorization Rules:
 * - Only Testers and Admins can validate bugs
 * - Bug must be in 'Resolved' status to be validated
 * 
 * Returns: Updated bug object with message
 * Status Codes: 200 (success), 400 (validation error), 403 (forbidden), 404 (not found), 500 (server error)
 */
async function handlePatch(req: NextApiRequest, res: NextApiResponse) {
  try {
    const services = getServiceContainer();
    const bugRepo = services.getBugRepository();
    const userRepo = services.getUserRepository();
    const activityRepo = services.getActivityRepository();
    
    const { id } = req.query;
    
    // Validate bug ID
    if (typeof id !== 'string') {
      return res.status(400).json({
        error: 'Invalid bug ID',
        details: 'Bug ID must be a string',
      });
    }
    
    // Validate request body
    const body = validateBugSchema.parse(req.body);
    
    // Verify user exists
    logger.debug('Verifying user exists', { userId: body.userId });
    const user = await userRepo.getById(body.userId);
    if (!user) {
      logger.warn('User not found', { userId: body.userId });
      return res.status(404).json({
        error: 'User not found',
        details: `User with ID ${body.userId} does not exist`,
      });
    }
    
    // Authorization check: Only Testers and Admins can validate bugs
    if (body.userRole !== UserRole.TESTER && body.userRole !== UserRole.ADMIN) {
      logger.warn('Unauthorized validation attempt', { 
        userId: body.userId, 
        userRole: body.userRole 
      });
      return res.status(403).json({
        error: 'Only Testers and Admins can validate bugs',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }
    
    // Get current bug
    logger.debug('Fetching bug', { bugId: id });
    const bug = await bugRepo.getById(id);
    if (!bug) {
      logger.warn('Bug not found', { bugId: id });
      return res.status(404).json({
        error: 'Bug not found',
        details: `Bug with ID ${id} does not exist`,
      });
    }
    
    // Check if bug is already validated
    if (bug.validated) {
      logger.info('Bug already validated', { bugId: id });
      return res.status(200).json({
        message: 'Bug is already validated',
        bug,
      });
    }
    
    // Check if bug is in Resolved status
    if (bug.status !== 'Resolved') {
      logger.warn('Bug not in Resolved status', { bugId: id, status: bug.status });
      return res.status(400).json({
        error: 'Bug must be in Resolved status to be validated',
        details: `Current status: ${bug.status}`,
      });
    }
    
    // Update bug to validated
    const updatedBug = await bugRepo.update(id, {
      validated: true,
    });
    
    // Log "validated" activity
    logger.debug('Logging validation activity', { bugId: id, userId: body.userId });
    await activityRepo.create({
      bugId: id,
      action: ActivityAction.VALIDATED,
      authorId: body.userId,
    });
    
    logger.info('Bug validated successfully', { bugId: id, userId: body.userId });
    return res.status(200).json({
      message: 'Bug validated successfully',
      bug: updatedBug,
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation request validation failed', { errors: error.issues });
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues,
      });
    }
    
    logger.error('Error validating bug', { error });
    return res.status(500).json({
      error: 'Failed to validate bug',
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
  if (req.method === 'PATCH') {
    return handlePatch(req, res);
  }
  
  return res.status(405).json({
    error: 'Method not allowed',
    details: `HTTP method ${req.method} is not supported for this endpoint`,
  });
}
