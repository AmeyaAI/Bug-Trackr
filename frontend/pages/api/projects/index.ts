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
import type { Project } from '@/lib/models/project';

/**
 * Response types for type-safe API responses
 */
type ProjectsSuccessResponse = Project[];

type ErrorResponse = {
  error: string;
  details?: string;
};

/**
 * GET /api/projects - List all projects
 * 
 * Returns: Array of project objects
 * Status Codes: 200 (success), 500 (server error)
 */
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ProjectsSuccessResponse | ErrorResponse>
) {
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
 * POST /api/projects - Create a new project
 * 
 * Request Body: Project data
 * Returns: Created project object
 * Status Codes: 201 (created), 400 (validation error), 500 (server error)
 */
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<Project | ErrorResponse>
) {
  try {
    const services = getServiceContainer();
    const projectRepo = services.getProjectRepository();
    
    logger.debug('Creating project', { data: req.body });
    const project = await projectRepo.create(req.body);
    
    logger.info('Project created successfully', { projectId: project.id });
    return res.status(201).json(project);
    
  } catch (error) {
    logger.error('Error creating project', { error });
    return res.status(500).json({
      error: 'Failed to create project',
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
  res: NextApiResponse<ProjectsSuccessResponse | Project | ErrorResponse>
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
