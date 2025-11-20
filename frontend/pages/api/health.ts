/**
 * Health Check API Route
 * 
 * Verifies that the application and Collection DB service are operational.
 * Returns health status and service information.
 * 
 * Requirements: 2.7, 12.8
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServiceContainer } from '@/lib/services/serviceContainer';
import { logger } from '@/lib/utils/logger';

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    collectionDb: {
      status: 'connected' | 'error';
      type: string;
      message?: string;
    };
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        collectionDb: {
          status: 'error',
          type: 'AppFlyte Collection Database',
          message: 'Method not allowed',
        },
      },
    });
  }

  try {
    logger.debug('Health check requested');

    // Get service container
    const services = getServiceContainer();

    // Test Collection DB connectivity with a lightweight query
    // We'll try to fetch users with a limit of 1 to minimize load
    try {
      const collectionDb = services.getCollectionDBService();
      
      // Perform a lightweight query to verify connectivity
      await collectionDb.getAllItems('users', {
        pageSize: 1,
        includeDetail: false,
      });

      logger.info('Health check passed');

      return res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          collectionDb: {
            status: 'connected',
            type: 'AppFlyte Collection Database',
          },
        },
      });
    } catch (dbError) {
      logger.error('Collection DB health check failed', { error: dbError });

      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          collectionDb: {
            status: 'error',
            type: 'AppFlyte Collection Database',
            message: dbError instanceof Error ? dbError.message : 'Unknown error',
          },
        },
      });
    }
  } catch (error) {
    logger.error('Health check failed', { error });

    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        collectionDb: {
          status: 'error',
          type: 'AppFlyte Collection Database',
          message: error instanceof Error ? error.message : 'Service initialization failed',
        },
      },
    });
  }
}
