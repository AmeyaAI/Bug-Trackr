/**
 * Project Management API Routes
 * 
 * Handles project listing operations.
 * 
 * GET /api/projects - List all projects
 * 
 * Requirements: 2.3
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/projects - List all projects
 * 
 * Returns: Array of project objects
 * Status Codes: 200 (success), 500 (server error)
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const services = getServiceContainer();
    const projectRepo = services.getProjectRepository();
    
    logger.debug('Fetching all projects');
    const projects = await projectRepo.getAll();
    
    logger.info('Projects fetched successfully', { count: projects.length });
    return res.status(200).json(projects);
    
  } catch (error) {
    logger.error('Error fetching projects', { error });
    return res.status(500).json({
      error: 'Failed to fetch projects',
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
