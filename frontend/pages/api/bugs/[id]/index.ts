/**
 * Bug Detail API Route
 * 
 * Handles fetching a single bug by ID with its comments.
 * 
 * GET /api/bugs/[id] - Get bug by ID with comments
 * 
 * Requirements: 2.2, 2.8
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/bugs/[id] - Get bug by ID with comments
 * 
 * Path Parameters:
 * - id: Bug ID
 * 
 * Returns: Bug object with comments array
 * Status Codes: 200 (success), 404 (not found), 500 (server error)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const services = getServiceContainer();
      const bugRepo = services.getBugRepository();
      const commentRepo = services.getCommentRepository();
      
      const { id } = req.query;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          error: 'Invalid bug ID',
          details: 'Bug ID must be provided as a string',
        });
      }
      
      logger.debug('Fetching bug by ID', { bugId: id });
      
      // Get bug by ID
      const bug = await bugRepo.getById(id);
      
      if (!bug) {
        logger.warn('Bug not found', { bugId: id });
        return res.status(404).json({
          error: 'Bug not found',
          details: `Bug with ID ${id} does not exist`,
        });
      }
      
      // Get comments for the bug
      logger.debug('Fetching comments for bug', { bugId: id });
      const comments = await commentRepo.getByBug(id);
      
      // Return bug with comments in the expected structure
      const response = {
        bug,
        comments,
      };
      
      logger.info('Bug fetched successfully with comments', { bugId: id, commentCount: comments.length });
      return res.status(200).json(response);
      
    } catch (error) {
      logger.error('Error fetching bug', { error });
      return res.status(500).json({
        error: 'Failed to fetch bug',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else if (req.method === 'PATCH') {
    try {
      const services = getServiceContainer();
      const bugRepo = services.getBugRepository();
      const { id } = req.query;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Invalid bug ID' });
      }

      const { sprintId, userRole, tags } = req.body;

      // Handle Sprint Update
      if (sprintId !== undefined) {
        // Only admin can change sprint
        if (userRole !== 'admin') {
           return res.status(403).json({ error: 'Only admins can change sprint assignment' });
        }

        logger.debug('Updating bug sprint', { bugId: id, sprintId });
        const updatedBug = await bugRepo.update(id, { sprintId });
        return res.status(200).json({ success: true, bug: updatedBug });
      }

      // Handle Tags Update
      if (tags !== undefined) {
        logger.debug('Updating bug tags', { bugId: id, tags });
        const updatedBug = await bugRepo.update(id, { tags });
        return res.status(200).json({ success: true, bug: updatedBug });
      }

      return res.status(400).json({ error: 'No valid fields to update' });

    } catch (error) {
      logger.error('Error updating bug', { error });
      return res.status(500).json({
        error: 'Failed to update bug',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    return res.status(405).json({
      error: 'Method not allowed',
      details: `HTTP method ${req.method} is not supported for this endpoint`,
    });
  }
}
