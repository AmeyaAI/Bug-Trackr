/**
 * User Management API Routes
 * 
 * Handles user listing operations.
 * 
 * GET /api/users - List all users
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
type UsersSuccessResponse = User[];

type ErrorResponse = {
  error: string;
  details?: string;
};

/**
 * GET /api/users - List all users
 * 
 * Returns: Array of user objects
 * Status Codes: 200 (success), 500 (server error)
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<UsersSuccessResponse | ErrorResponse>
) {
  try {
    const services = getServiceContainer();
    const userRepo = services.getUserRepository();
    
    logger.debug('Fetching all users');
    const users = await userRepo.getAll();
    
    logger.info('Users fetched successfully', { count: users.length });
    return res.status(200).json(users);
    
  } catch (error) {
    logger.error('Error fetching users', { error });
    return res.status(500).json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/users - Create a new user
 * 
 * Request Body: User data
 * Returns: Created user object
 * Status Codes: 201 (created), 400 (validation error), 500 (server error)
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<User | ErrorResponse>
) {
  try {
    const services = getServiceContainer();
    const userRepo = services.getUserRepository();
    
    logger.debug('Creating user', { data: req.body });
    const user = await userRepo.create(req.body);
    
    logger.info('User created successfully', { userId: user.id });
    return res.status(201).json(user);
    
  } catch (error) {
    logger.error('Error creating user', { error });
    return res.status(500).json({
      error: 'Failed to create user',
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
  res: NextApiResponse<UsersSuccessResponse | User | ErrorResponse>
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
