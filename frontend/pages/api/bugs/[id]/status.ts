/**
 * Bug Status Update API Route
 * 
 * Handles updating bug status with role-based authorization.
 * 
 * PATCH /api/bugs/[id]/status - Update bug status
 * 
 * Requirements: 2.2, 2.8, 3.1, 3.2, 3.7
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { updateBugStatusSchema } from '@/lib/utils/validation';
import { BugStatus } from '@/lib/models/bug';
import { UserRole } from '@/lib/models/user';
import { ActivityAction } from '@/lib/models/activity';
import { logger } from '@/lib/utils/logger';

/**
 * Checks if a user has permission to update bug status
 * 
 * Authorization Rules:
 * - Only Admin can modify closed bugs
 * - Only Testers and Admins can close bugs
 * - Developers can update status (except close)
 * 
 * @param currentStatus - Current bug status
 * @param newStatus - New status to set
 * @param userRole - Role of the user making the change
 * @returns Object with allowed flag and optional reason
 */
function checkBugStatusUpdatePermission(
  currentStatus: BugStatus,
  newStatus: BugStatus,
  userRole: UserRole
): { allowed: boolean; reason?: string } {
  // Only Admin can modify closed bugs
  if (currentStatus === BugStatus.CLOSED && userRole !== UserRole.ADMIN) {
    return {
      allowed: false,
      reason: 'Only Admins can modify closed bugs',
    };
  }
  
  // Only Testers and Admins can close bugs
  if (newStatus === BugStatus.CLOSED) {
    if (userRole !== UserRole.TESTER && userRole !== UserRole.ADMIN) {
      return {
        allowed: false,
        reason: 'Only Testers and Admins can close bugs',
      };
    }
  }
  
  return { allowed: true };
}

/**
 * PATCH /api/bugs/[id]/status - Update bug status
 * 
 * Path Parameters:
 * - id: Bug ID
 * 
 * Request Body:
 * - status: New bug status (required)
 * - userId: User ID making the change (required)
 * - userRole: Role of the user (required)
 * 
 * Returns: Updated bug object
 * Status Codes: 200 (success), 400 (validation error), 403 (forbidden), 404 (not found), 500 (server error)
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
    const activityRepo = services.getActivityRepository();
    
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        error: 'Invalid bug ID',
        details: 'Bug ID must be provided as a string',
      });
    }
    
    // Validate request body
    const body = updateBugStatusSchema.parse(req.body);
    
    logger.debug('Updating bug status', { bugId: id, newStatus: body.status, userId: body.userId });
    
    // Get current bug
    const currentBug = await bugRepo.getById(id);
    
    if (!currentBug) {
      logger.warn('Bug not found', { bugId: id });
      return res.status(404).json({
        error: 'Bug not found',
        details: `Bug with ID ${id} does not exist`,
      });
    }
    
    // Check authorization
    const permission = checkBugStatusUpdatePermission(
      currentBug.status,
      body.status,
      body.userRole
    );
    
    if (!permission.allowed) {
      logger.warn('Bug status update forbidden', {
        bugId: id,
        currentStatus: currentBug.status,
        newStatus: body.status,
        userRole: body.userRole,
        reason: permission.reason,
      });
      return res.status(403).json({
        error: 'Forbidden',
        details: permission.reason,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }
    
    // Update bug status
    const updatedBug = await bugRepo.updateStatus(id, body.status);
    
    // Log "status_changed" activity
    logger.debug('Logging status change activity', { bugId: id, newStatus: body.status });
    await activityRepo.create({
      bugId: id,
      action: ActivityAction.STATUS_CHANGED,
      authorId: body.userId,
    });
    
    logger.info('Bug status updated successfully', {
      bugId: id,
      oldStatus: currentBug.status,
      newStatus: body.status,
      userId: body.userId,
    });
    
    return res.status(200).json(updatedBug);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Bug status update validation failed', { errors: error.issues });
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues,
      });
    }
    
    logger.error('Error updating bug status', { error });
    return res.status(500).json({
      error: 'Failed to update bug status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
