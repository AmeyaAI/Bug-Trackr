import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { updateSprintSchema } from '@/lib/utils/validation';
import { logger } from '@/lib/utils/logger';

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid sprint ID' });
    }

    const services = getServiceContainer();
    const sprintRepo = services.getSprintRepository();
    
    const sprint = await sprintRepo.getById(id);
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }
    
    return res.status(200).json(sprint);
  } catch (error) {
    logger.error('Error fetching sprint', { error });
    return res.status(500).json({ error: 'Failed to fetch sprint' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid sprint ID' });
    }

    const services = getServiceContainer();
    const sprintRepo = services.getSprintRepository();

    // Check existence
    const existing = await sprintRepo.getById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    const body = updateSprintSchema.parse(req.body);
    const updated = await sprintRepo.update(id, body);
    
    return res.status(200).json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    logger.error('Error updating sprint', { error });
    return res.status(500).json({ error: 'Failed to update sprint' });
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  if (req.method === 'PUT' || req.method === 'PATCH') {
    return handlePut(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
