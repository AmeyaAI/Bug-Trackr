/**
 * User Detail API Route
 * 
 * Handles fetching a single user by ID.
 * 
 * GET /api/users/[id] - Get user by ID
 * 
 * Requirements: 2.4
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { logger } from '@/lib/utils/logger';
import type { User } from '@/lib/models/user';

/**
 * Response types for type-safe API responses
 */
type UserSuccessResponse = User;

type ErrorResponse = {
  error: string;
  details?: string;
};

/**
 * GET /api/users/[id] - Get user by ID
 * 
 * Path Parameters:
 * - id: User ID
 * 
 * Returns: User object
 * Status Codes: 200 (success), 404 (not found), 400 (bad request), 500 (server error)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserSuccessResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      details: `HTTP method ${req.method} is not supported for this endpoint`,
    });
  }
  
  try {
    const services = getServiceContainer();
    const userRepo = services.getUserRepository();
    
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        error: 'Invalid user ID',
        details: 'User ID must be provided as a string',
      });
    }
    
    logger.debug('Fetching user by ID', { userId: id });
    
    // Get user by ID
    const user = await userRepo.getById(id);
    
    if (!user) {
      logger.warn('User not found', { userId: id });
      return res.status(404).json({
        error: 'User not found',
        details: `User with ID ${id} does not exist`,
      });
    }
    
    logger.info('User fetched successfully', { userId: id });
    return res.status(200).json(user);
    
  } catch (error) {
    logger.error('Error fetching user', { error });
    return res.status(500).json({
      error: 'Failed to fetch user',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
