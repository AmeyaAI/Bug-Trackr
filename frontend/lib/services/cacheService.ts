import { LRUCache } from 'lru-cache';
import { logger } from '../utils/logger';

/**
 * Cache Service
 * 
 * Provides an in-memory caching layer using LRU (Least Recently Used) strategy.
 * Used to cache frequently accessed but rarely changed data (Users, Projects, Sprints).
 */
export class CacheService {
  private cache: LRUCache<string, any>;

  constructor() {
    this.cache = new LRUCache({
      max: 500, // Max 500 items
      ttl: 1000 * 60 * 5, // 5 minutes TTL
      allowStale: false,
    });
    logger.info('CacheService initialized');
  }

  /**
   * Retrieve an item from the cache
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get(key) as T;
    if (value) {
      logger.debug('Cache hit', { key });
    } else {
      logger.debug('Cache miss', { key });
    }
    return value;
  }

  /**
   * Add an item to the cache
   */
  set(key: string, value: any, ttl?: number): void {
    this.cache.set(key, value, { ttl });
    logger.debug('Cache set', { key, ttl });
  }

  /**
   * Remove an item from the cache
   */
  delete(key: string): void {
    this.cache.delete(key);
    logger.debug('Cache deleted', { key });
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }
}
