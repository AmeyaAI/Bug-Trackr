/**
 * Project Detail API Route
 * 
 * Handles fetching a single project by ID.
 * 
 * GET /api/projects/[id] - Get project by ID
 * 
 * Requirements: 2.3
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { logger } from '@/lib/utils/logger';
import type { Project } from '@/lib/models/project';

/**
 * Response types for type-safe API responses
 */
type ProjectSuccessResponse = Project;

type ErrorResponse = {
  error: string;
  details?: string;
};

/**
 * GET /api/projects/[id] - Get project by ID
 * 
 * Path Parameters:
 * - id: Project ID
 * 
 * Returns: Project object
 * Status Codes: 200 (success), 400 (bad request), 404 (not found), 405 (method not allowed), 500 (server error)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProjectSuccessResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      details: `HTTP method ${req.method} is not supported for this endpoint`,
    });
  }
  
  try {
    const services = getServiceContainer();
    const projectRepo = services.getProjectRepository();
    
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        error: 'Invalid project ID',
        details: 'Project ID must be provided as a string',
      });
    }
    
    logger.debug('Fetching project by ID', { projectId: id });
    
    // Get project by ID
    const project = await projectRepo.getById(id);
    
    if (!project) {
      logger.warn('Project not found', { projectId: id });
      return res.status(404).json({
        error: 'Project not found',
        details: `Project with ID ${id} does not exist`,
      });
    }
    
    logger.info('Project fetched successfully', { projectId: id });
    return res.status(200).json(project);
    
  } catch (error) {
    logger.error('Error fetching project', { error });
    return res.status(500).json({
      error: 'Failed to fetch project',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
