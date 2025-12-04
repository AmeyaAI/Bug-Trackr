import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { createSprintSchema } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { projectId } = req.query;
    const services = getServiceContainer();
    const sprintRepo = services.getSprintRepository();
    
    if (projectId && typeof projectId === 'string') {
      const sprints = await sprintRepo.getByProject(projectId);
      return res.status(200).json(sprints);
    }

    // If no projectId provided, return all sprints
    const sprints = await sprintRepo.getAll();
    return res.status(200).json(sprints);
  } catch (error) {
    logger.error('Error fetching sprints', { error });
    return res.status(500).json({
      error: 'Failed to fetch sprints',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const services = getServiceContainer();
    const sprintRepo = services.getSprintRepository();
    const projectRepo = services.getProjectRepository();

    // Validate request body
    const body = createSprintSchema.parse(req.body);

    // Verify project exists
    const project = await projectRepo.getById(body.projectId);
    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        details: `Project with ID ${body.projectId} does not exist`,
      });
    }

    const sprint = await sprintRepo.create(body);
    return res.status(201).json(sprint);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.issues,
      });
    }
    logger.error('Error creating sprint', { error });
    return res.status(500).json({
      error: 'Failed to create sprint',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  if (req.method === 'POST') {
    return handlePost(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
