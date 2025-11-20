/**
 * Activity Log API Routes
 * 
 * Handles activity log retrieval operations.
 * 
 * GET /api/activities - List all activities with optional filtering
 * 
 * Requirements: 2.6
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/activities - List all activities with optional filtering
 * 
 * Query Parameters:
 * - bugId: Filter activities by bug ID (optional)
 * - limit: Limit the number of recent activities returned (optional, max 1000)
 * 
 * Note: If both bugId and limit are provided, bugId takes precedence.
 * 
 * Returns: Array of activity objects sorted by timestamp (descending)
 * Status Codes: 200 (success), 400 (invalid query params), 500 (server error)
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const services = getServiceContainer();
    const activityRepo = services.getActivityRepository();
    
    const { bugId, limit } = req.query;
    
    // Validate query parameter types
    if (bugId !== undefined && typeof bugId !== 'string') {
      return res.status(400).json({
        error: 'Invalid query parameter',
        details: 'bugId must be a single string value',
      });
    }
    
    if (limit !== undefined && typeof limit !== 'string') {
      return res.status(400).json({
        error: 'Invalid query parameter',
        details: 'limit must be a single string value',
      });
    }
    
    let activities;
    
    // Apply filter based on query parameters
    // Priority: bugId > limit > all
    if (bugId) {
      logger.debug('Fetching activities by bug', { bugId });
      activities = await activityRepo.getByBug(bugId);
    } else if (limit) {
      const limitNum = parseInt(limit, 10);
      
      // Validate limit is a valid number
      if (isNaN(limitNum) || limitNum <= 0) {
        return res.status(400).json({
          error: 'Invalid limit parameter',
          details: 'limit must be a positive integer',
        });
      }
      
      logger.debug('Fetching recent activities', { limit: limitNum });
      activities = await activityRepo.getRecent(limitNum);
    } else {
      logger.debug('Fetching all activities');
      activities = await activityRepo.getAll();
    }
    
    // Sort activities by timestamp in descending order (most recent first)
    const sortedActivities = activities.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
    
    logger.info('Activities fetched successfully', { count: sortedActivities.length });
    return res.status(200).json(sortedActivities);
    
  } catch (error) {
    logger.error('Error fetching activities', { error });
    return res.status(500).json({
      error: 'Failed to fetch activities',
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
  
  return res.status(405).json({
    error: 'Method not allowed',
    details: `HTTP method ${req.method} is not supported for this endpoint`,
  });
}
