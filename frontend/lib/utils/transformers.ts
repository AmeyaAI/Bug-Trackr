/**
 * Data transformation utilities for converting between Collection DB format
 * and TypeScript application format
 */

/**
 * Converts a camelCase string to snake_case
 * @param str - The camelCase string to convert
 * @returns The snake_case version of the string
 * @example
 * toSnakeCase('userId') // returns 'user_id'
 * toSnakeCase('createdAt') // returns 'created_at'
 */
export function toSnakeCase(str: string): string {
  if (!str) return str;
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Converts a snake_case string to camelCase
 * @param str - The snake_case string to convert
 * @returns The camelCase version of the string
 * @example
 * toCamelCase('user_id') // returns 'userId'
 * toCamelCase('created_at') // returns 'createdAt'
 */
export function toCamelCase(str: string): string {
  if (!str) return str;
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts an object's keys from snake_case to camelCase
 * Recursively transforms nested objects and arrays
 * @param obj - Object with snake_case keys
 * @returns New object with camelCase keys
 * @example
 * keysToCamelCase({ user_id: '123', created_at: '2024-01-01' })
 * // returns { userId: '123', createdAt: '2024-01-01' }
 */
export function keysToCamelCase<T = any>(obj: Record<string, any>): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => keysToCamelCase(item)) as any;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[camelKey] = keysToCamelCase(value);
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map(item => 
        typeof item === 'object' && item !== null ? keysToCamelCase(item) : item
      );
    } else {
      result[camelKey] = value;
    }
  }
  
  return result as T;
}

/**
 * Converts an object's keys from camelCase to snake_case
 * Recursively transforms nested objects and arrays
 * @param obj - Object with camelCase keys
 * @returns New object with snake_case keys
 * @example
 * keysToSnakeCase({ userId: '123', createdAt: '2024-01-01' })
 * // returns { user_id: '123', created_at: '2024-01-01' }
 */
export function keysToSnakeCase<T = any>(obj: Record<string, any>): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => keysToSnakeCase(item)) as any;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[snakeKey] = keysToSnakeCase(value);
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map(item => 
        typeof item === 'object' && item !== null ? keysToSnakeCase(item) : item
      );
    } else {
      result[snakeKey] = value;
    }
  }
  
  return result as T;
}

/**
 * Converts a Date object to ISO string format for Collection DB
 * @param date - Date object to convert
 * @returns ISO string representation
 * @throws {Error} If date is invalid
 * @example
 * dateToISO(new Date('2024-01-01')) // returns '2024-01-01T00:00:00.000Z'
 */
export function dateToISO(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided to dateToISO');
  }
  return date.toISOString();
}

/**
 * Converts an ISO string to a Date object
 * @param isoStr - ISO string to convert
 * @returns Date object
 * @throws {Error} If ISO string is invalid
 * @example
 * dateFromISO('2024-01-01T00:00:00.000Z') // returns Date object
 */
export function dateFromISO(isoStr: string): Date {
  if (!isoStr || typeof isoStr !== 'string') {
    throw new Error('Invalid ISO string provided to dateFromISO');
  }
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date string: ${isoStr}`);
  }
  return date;
}

/**
 * Converts an array of tags to a comma-separated string for Collection DB
 * @param tags - Array of tag strings
 * @returns Comma-separated string
 * @example
 * tagsToString(['bug', 'urgent', 'frontend']) // returns 'bug,urgent,frontend'
 * tagsToString([]) // returns ''
 */
export function tagsToString(tags: string[]): string {
  if (!Array.isArray(tags)) {
    return '';
  }
  return tags.filter(tag => tag && tag.trim()).join(',');
}

/**
 * Converts a comma-separated string to an array of tags
 * @param tagsStr - Comma-separated string of tags
 * @returns Array of trimmed tag strings
 * @example
 * tagsFromString('bug,urgent,frontend') // returns ['bug', 'urgent', 'frontend']
 * tagsFromString('') // returns []
 * tagsFromString('bug, , urgent') // returns ['bug', 'urgent'] (filters empty)
 */
export function tagsFromString(tagsStr: string): string[] {
  if (!tagsStr || typeof tagsStr !== 'string' || tagsStr.trim() === '') {
    return [];
  }
  return tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
}

/**
 * Converts an array of BugTag enums to a comma-separated string for Collection DB
 * @param tags - Array of BugTag enum values
 * @returns Comma-separated string
 * @example
 * import { BugTag } from '../models/bug';
 * bugTagsToString([BugTag.EPIC, BugTag.BUG_FRONTEND]) // returns 'Epic,Bug:Frontend'
 */
export function bugTagsToString(tags: string[]): string {
  return tagsToString(tags);
}

/**
 * Converts a comma-separated string to an array of BugTag enum values
 * Note: Validation should be done using Zod schemas at the API boundary
 * This function only performs string parsing
 * @param tagsStr - Comma-separated string of tags
 * @returns Array of tag strings
 * @example
 * bugTagsFromString('Epic,Bug:Frontend') // returns ['Epic', 'Bug:Frontend']
 */
export function bugTagsFromString(tagsStr: string): string[] {
  return tagsFromString(tagsStr);
}
