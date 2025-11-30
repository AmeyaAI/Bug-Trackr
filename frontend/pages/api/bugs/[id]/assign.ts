/**
 * Bug Assignment API Route
 * 
 * Handles assigning bugs to users.
 * 
 * PATCH /api/bugs/[id]/assign - Assign bug to user
 * 
 * Requirements: 2.2, 2.8, 3.5, 3.7
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { assignBugSchema } from '@/lib/utils/validation';
import { ActivityAction } from '@/lib/models/activity';
import { logger } from '@/lib/utils/logger';

/**
 * PATCH /api/bugs/[id]/assign - Assign bug to user
 * 
 * Path Parameters:
 * - id: Bug ID
 * 
 * Request Body:
 * - assignedTo: User ID to assign the bug to (required)
 * - assignedBy: User ID of the person making the assignment (required)
 * 
 * Returns: Updated bug object
 * Status Codes: 200 (success), 400 (validation error), 404 (bug or user not found), 500 (server error)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({
      error: 'Method not allowed',
      details: `HTTP method ${req.method} is not supported for this endpoint`,
    });
  }
  
  try {
    const services = getServiceContainer();
    const bugRepo = services.getBugRepository();
    const userRepo = services.getUserRepository();
    const activityRepo = services.getActivityRepository();
    
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        error: 'Invalid bug ID',
        details: 'Bug ID must be provided as a string',
      });
    }
    
    // Validate request body
    const body = assignBugSchema.parse(req.body);
    
    logger.debug('Assigning bug', { bugId: id, assignedTo: body.assignedTo, assignedBy: body.assignedBy });
    
    // Get current bug
    const currentBug = await bugRepo.getById(id);
    
    if (!currentBug) {
      logger.warn('Bug not found', { bugId: id });
      return res.status(404).json({
        error: 'Bug not found',
        details: `Bug with ID ${id} does not exist`,
      });
    }
    
    // Verify assignee exists
    logger.debug('Verifying assignee exists', { assignedTo: body.assignedTo });
    const assignee = await userRepo.getById(body.assignedTo);
    
    if (!assignee) {
      logger.warn('Assignee user not found', { assignedTo: body.assignedTo });
      return res.status(404).json({
        error: 'Assignee user not found',
        details: `User with ID ${body.assignedTo} does not exist`,
      });
    }
    
    // Update bug assignment
    const updatedBug = await bugRepo.updateAssignment(id, body.assignedTo);
    
    // Log "assigned" activity
    logger.debug('Logging bug assignment activity', { bugId: id, assignedTo: body.assignedTo });
    await activityRepo.create({
      bugId: id,
      action: `${ActivityAction.ASSIGNED}:${body.assignedTo}` as ActivityAction,
      authorId: body.assignedBy,
    });
    
    logger.info('Bug assigned successfully', {
      bugId: id,
      assignedTo: body.assignedTo,
      assignedBy: body.assignedBy,
    });
    
    return res.status(200).json(updatedBug);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Bug assignment validation failed', { errors: error.issues });
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues,
      });
    }
    
    logger.error('Error assigning bug', { error });
    return res.status(500).json({
      error: 'Failed to assign bug',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
