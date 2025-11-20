/**
 * Bug Management API Routes
 * 
 * Handles bug listing and creation operations.
 * 
 * GET /api/bugs - List all bugs with optional filtering
 * POST /api/bugs - Create a new bug
 * 
 * Requirements: 2.2, 2.8, 3.4, 3.5, 3.6, 9.1, 9.2
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { createBugSchema } from '@/lib/utils/validation';
import { BugStatus } from '@/lib/models/bug';
import { ActivityAction } from '@/lib/models/activity';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/bugs - List all bugs with optional filtering
 * 
 * Query Parameters (mutually exclusive - only one filter allowed at a time):
 * - projectId: Filter bugs by project ID
 * - status: Filter bugs by status (Open, In Progress, Resolved, Closed)
 * - assignedTo: Filter bugs by assignee user ID
 * 
 * Note: If multiple filter parameters are provided, a 400 error will be returned.
 * To retrieve all bugs without filtering, omit all query parameters.
 * 
 * Returns: Array of bug objects
 * Status Codes: 200 (success), 400 (invalid or multiple query params), 500 (server error)
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const services = getServiceContainer();
    const bugRepo = services.getBugRepository();
    
    const { projectId, status, assignedTo } = req.query;
    
    // Count how many filters are provided
    const filterCount = [projectId, status, assignedTo].filter(param => param !== undefined).length;
    
    // Ensure only one filter is provided at a time
    if (filterCount > 1) {
      return res.status(400).json({
        error: 'Multiple filters not supported',
        details: 'Only one filter parameter (projectId, status, or assignedTo) can be used at a time. To use multiple filters, make separate requests or retrieve all bugs and filter client-side.',
      });
    }
    
    // Validate status parameter if provided
    if (status && !Object.values(BugStatus).includes(status as BugStatus)) {
      return res.status(400).json({
        error: 'Invalid status parameter',
        details: `Status must be one of: ${Object.values(BugStatus).join(', ')}`,
      });
    }
    
    let bugs;
    
    // Apply single filter based on query parameter
    if (projectId && typeof projectId === 'string') {
      logger.debug('Fetching bugs by project', { projectId });
      bugs = await bugRepo.getByProject(projectId);
    } else if (status && typeof status === 'string') {
      logger.debug('Fetching bugs by status', { status });
      bugs = await bugRepo.getByStatus(status as BugStatus);
    } else if (assignedTo && typeof assignedTo === 'string') {
      logger.debug('Fetching bugs by assignee', { assignedTo });
      bugs = await bugRepo.getByAssignee(assignedTo);
    } else {
      logger.debug('Fetching all bugs');
      bugs = await bugRepo.getAll();
    }
    
    logger.info('Bugs fetched successfully', { count: bugs.length });
    return res.status(200).json(bugs);
    
  } catch (error) {
    logger.error('Error fetching bugs', { error });
    return res.status(500).json({
      error: 'Failed to fetch bugs',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/bugs - Create a new bug
 * 
 * Request Body:
 * - title: Bug title (required, max 200 chars)
 * - description: Bug description (required)
 * - projectId: Project ID (required)
 * - reportedBy: Reporter user ID (required)
 * - priority: Bug priority (required)
 * - severity: Bug severity (required)
 * - tags: Array of bug tags (optional)
 * - status: Bug status (optional, defaults to Open)
 * - assignedTo: Assignee user ID (optional)
 * - attachments: Array of attachment URLs (optional)
 * 
 * Returns: Created bug object with 201 status
 * Status Codes: 201 (created), 400 (validation error), 404 (project/user not found), 500 (server error)
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const services = getServiceContainer();
    const bugRepo = services.getBugRepository();
    const projectRepo = services.getProjectRepository();
    const userRepo = services.getUserRepository();
    const activityRepo = services.getActivityRepository();
    
    // Validate request body
    const body = createBugSchema.parse(req.body);
    
    // Verify project exists
    logger.debug('Verifying project exists', { projectId: body.projectId });
    const project = await projectRepo.getById(body.projectId);
    if (!project) {
      logger.warn('Project not found', { projectId: body.projectId });
      return res.status(404).json({
        error: 'Project not found',
        details: `Project with ID ${body.projectId} does not exist`,
      });
    }
    
    // Verify reporter exists
    logger.debug('Verifying reporter exists', { reportedBy: body.reportedBy });
    const reporter = await userRepo.getById(body.reportedBy);
    if (!reporter) {
      logger.warn('Reporter user not found', { reportedBy: body.reportedBy });
      return res.status(404).json({
        error: 'Reporter user not found',
        details: `User with ID ${body.reportedBy} does not exist`,
      });
    }
    
    // Verify assignee exists if provided
    if (body.assignedTo) {
      logger.debug('Verifying assignee exists', { assignedTo: body.assignedTo });
      const assignee = await userRepo.getById(body.assignedTo);
      if (!assignee) {
        logger.warn('Assignee user not found', { assignedTo: body.assignedTo });
        return res.status(404).json({
          error: 'Assignee user not found',
          details: `User with ID ${body.assignedTo} does not exist`,
        });
      }
    }
    
    // Create bug with default values
    const bug = await bugRepo.create({
      title: body.title,
      description: body.description,
      projectId: body.projectId,
      reportedBy: body.reportedBy,
      priority: body.priority,
      severity: body.severity,
      status: body.status || BugStatus.OPEN,
      assignedTo: body.assignedTo || null,
      attachments: body.attachments ? body.attachments.join(',') : '',
      tags: body.tags || [],
    });
    
    // Log "reported" activity
    logger.debug('Logging bug reported activity', { bugId: bug.id });
    await activityRepo.create({
      bugId: bug.id,
      action: ActivityAction.REPORTED,
      authorId: body.reportedBy,
    });
    
    logger.info('Bug created successfully', { bugId: bug.id, title: bug.title });
    return res.status(201).json(bug);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Bug validation failed', { errors: error.issues });
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues,
      });
    }
    
    logger.error('Error creating bug', { error });
    return res.status(500).json({
      error: 'Failed to create bug',
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
