/**
 * Collection DB Service - HTTP client for AppFlyte Collection Database
 * 
 * This service provides a complete abstraction over the Collection DB REST API,
 * handling authentication, URL construction, request/response transformation,
 * and error handling.
 * 
 * Key Features:
 * - Bearer token authentication
 * - Plural/singular collection name handling
 * - Query parameter support for list operations
 * - Filter queries for optimized data retrieval
 * - Automatic snake_case ↔ camelCase transformation
 * - Comprehensive error handling
 * 
 * @example
 * const service = new CollectionDBService(baseUrl, apiKey);
 * const users = await service.getAllItems('users');
 * const user = await service.getItemById('user', '123');
 */

import { logger } from '../utils/logger';
import { keysToCamelCase, keysToSnakeCase } from '../utils/transformers';

/**
 * Query options for list operations
 * These parameters are ONLY used for list operations (plural collection names)
 */
export interface QueryOptions {
  /** Maximum number of items to return (max 1000) */
  pageSize?: number;
  /** Pagination cursor from previous response */
  lastEvaluatedKey?: string | null;
  /** Set to false for faster queries (returns only payload) */
  includeDetail?: boolean;
  /** Filter queries for field-based filtering */
  filter?: FilterQuery[];
}

/**
 * Filter query for field-based filtering
 * Used to filter data at the Collection DB level
 */
export interface FilterQuery {
  /** Field name to filter on (e.g., "payload.project_id") */
  field_name: string;
  /** Value to compare against */
  field_value: string | number | boolean | null;
  /** Comparison operator */
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains';
}

/**
 * Collection DB response structure
 */
interface CollectionDBResponse<T> {
  payload?: T;
  __auto_id__?: string;
  [key: string]: unknown;
}

/**
 * Collection DB Service class
 * Provides CRUD operations for AppFlyte Collection Database
 */
export class CollectionDBService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  /**
   * Creates a new Collection DB Service instance
   * @param baseUrl - Base URL for Collection DB (e.g., https://.../.../dpdo_bug_tracker)
   * @param apiKey - API key for authentication
   * @param timeout - Request timeout in milliseconds (default: 30000)
   */
  constructor(baseUrl: string, apiKey: string, timeout: number = 30000) {
    if (!baseUrl || baseUrl.trim() === '') {
      throw new Error('Collection DB base URL is required');
    }
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Collection DB API key is required');
    }
    if (timeout <= 0) {
      throw new Error('Timeout must be positive');
    }

    this.baseUrl = baseUrl.trim().replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey.trim();
    this.timeout = timeout;

    logger.info('CollectionDBService initialized', {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
    });
  }

  /**
   * Constructs URL for list operations (plural collection name)
   * @param collectionPlural - Plural collection name (e.g., 'users', 'bug_tracking_bugss')
   * @returns Full URL for list operations
   */
  private buildListUrl(collectionPlural: string): string {
    return `${this.baseUrl}/${collectionPlural}`;
  }

  /**
   * Constructs URL for single item operations (singular collection name)
   * @param collectionSingular - Singular collection name (e.g., 'user', 'bug_tracking_bugs')
   * @param itemId - Item ID
   * @returns Full URL for item operations
   */
  private buildItemUrl(collectionSingular: string, itemId: string): string {
    return `${this.baseUrl}/${collectionSingular}/${itemId}`;
  }

  /**
   * Builds query parameters for list operations
   * @param options - Query options
   * @returns URLSearchParams object
   */
  private buildQueryParams(options?: QueryOptions): URLSearchParams {
    const params = new URLSearchParams();

    if (!options) {
      return params;
    }

    if (options.pageSize !== undefined) {
      // Enforce max page size of 1000
      const pageSize = Math.min(options.pageSize, 1000);
      params.append('page_size', pageSize.toString());
    }

    if (options.lastEvaluatedKey !== undefined && options.lastEvaluatedKey !== null) {
      params.append('last_evaluated_key', options.lastEvaluatedKey);
    }

    if (options.includeDetail !== undefined) {
      params.append('include_detail', options.includeDetail.toString());
    }

    if (options.filter && options.filter.length > 0) {
      // Encode filter as JSON string
      const filterJson = JSON.stringify(options.filter);
      params.append('filter', filterJson);
    }

    return params;
  }

  /**
   * Makes an HTTP request with timeout and error handling
   * @param url - Request URL
   * @param options - Fetch options
   * @returns Response object
   * @throws {Error} On network errors, timeouts, or HTTP errors
   */
  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      
      const err = error as Error;
      if (err.name === 'AbortError') {
        logger.error('Collection DB request timeout', { url, timeout: this.timeout });
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      
      logger.error('Collection DB request failed', { url, error: err.message });
      throw new Error(`Network error: ${err.message}`);
    }
  }

  /**
   * Parses Collection DB response and transforms to application format
   * Handles nested payload structures and field name conversion
   * @param response - Raw Collection DB response
   * @returns Parsed and transformed item
   * @private
   */
  private parseResponse<T>(response: CollectionDBResponse<unknown>): T {
    // Extract payload if nested
    const data = response.payload || response;
    
    // Extract __auto_id__ as the primary ID
    const dataWithId = data as Record<string, unknown>;
    const id = response.__auto_id__ || dataWithId.__auto_id__;
    
    // Convert snake_case to camelCase
    const camelCaseData = keysToCamelCase(data);
    
    // Add ID to the result if it exists
    if (id) {
      camelCaseData.id = id;
    }
    
    return camelCaseData as T;
  }

  /**
   * Handles HTTP error responses with appropriate error messages
   * @param response - HTTP response
   * @param operation - Operation being performed (for error context)
   * @param collection - Collection name
   * @param id - Optional item ID
   * @throws {Error} With descriptive error message
   * @private
   */
  private async handleErrorResponse(
    response: Response,
    operation: string,
    collection: string,
    id?: string
  ): Promise<never> {
    const errorText = await response.text();
    const context = id ? `${collection}/${id}` : collection;
    
    logger.error(`Failed to ${operation}`, {
      collection,
      id,
      status: response.status,
      error: errorText,
    });

    switch (response.status) {
      case 400:
        throw new Error(`Validation error for ${context}: ${errorText}`);
      case 404:
        throw new Error(`Resource not found: ${context}`);
      case 403:
        throw new Error(`Access denied for ${context}`);
      case 500:
        throw new Error(`Server error for ${context}: ${errorText}`);
      default:
        throw new Error(`Failed to ${operation} ${context}: ${response.status} ${errorText}`);
    }
  }

  /**
   * Creates a new item in a collection
   * @param collectionPlural - Plural collection name
   * @param data - Item data (will be converted to snake_case)
   * @returns Created item with ID
   * @throws {Error} On validation errors or server errors
   * @example
   * const user = await service.createItem('users', {
   *   userId: '123',
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * });
   */
  async createItem<T>(collectionPlural: string, data: Partial<T>): Promise<T> {
    const url = this.buildListUrl(collectionPlural);
    
    // Convert camelCase to snake_case for Collection DB
    const snakeCaseData = keysToSnakeCase(data);
    
    logger.debug('Creating item', { collection: collectionPlural, data: snakeCaseData });

    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(snakeCaseData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to create item', {
        collection: collectionPlural,
        status: response.status,
        error: errorText,
      });
      
      if (response.status === 400) {
        throw new Error(`Validation error: ${errorText}`);
      }
      throw new Error(`Failed to create item: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    logger.info('Item created successfully', {
      collection: collectionPlural,
      id: result.__auto_id__,
    });

    return this.parseResponse<T>(result);
  }

  /**
   * Retrieves all items from a collection
   * @param collectionPlural - Plural collection name
   * @param options - Query options for filtering and pagination
   * @returns Array of items
   * @throws {Error} On server errors
   * @example
   * const users = await service.getAllItems('users', {
   *   pageSize: 100,
   *   includeDetail: false
   * });
   */
  async getAllItems<T>(collectionPlural: string, options?: QueryOptions): Promise<T[]> {
    const params = this.buildQueryParams(options);
    const url = `${this.buildListUrl(collectionPlural)}?${params.toString()}`;
    
    logger.debug('Fetching all items', { collection: collectionPlural, options });

    const response = await this.makeRequest(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to fetch items', {
        collection: collectionPlural,
        status: response.status,
        error: errorText,
      });
      throw new Error(`Failed to fetch items: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    // Handle both array and paginated response formats
    const items = Array.isArray(result) ? result : (result.items || []);
    
    logger.info('Items fetched successfully', {
      collection: collectionPlural,
      count: items.length,
    });

    return items.map((item: unknown) => this.parseResponse<T>(item as CollectionDBResponse<unknown>));
  }

  /**
   * Retrieves a single item by ID
   * @param collectionSingular - Singular collection name
   * @param id - Item ID
   * @returns Item or null if not found
   * @throws {Error} On server errors
   * @example
   * const user = await service.getItemById('user', '123');
   * if (!user) {
   *   console.log('User not found');
   * }
   */
  async getItemById<T>(collectionSingular: string, id: string): Promise<T | null> {
    const url = this.buildItemUrl(collectionSingular, id);
    
    logger.debug('Fetching item by ID', { collection: collectionSingular, id });

    const response = await this.makeRequest(url, {
      method: 'GET',
    });

    if (response.status === 404) {
      logger.debug('Item not found', { collection: collectionSingular, id });
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to fetch item', {
        collection: collectionSingular,
        id,
        status: response.status,
        error: errorText,
      });
      throw new Error(`Failed to fetch item: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    logger.info('Item fetched successfully', {
      collection: collectionSingular,
      id,
    });

    return this.parseResponse<T>(result);
  }

  /**
   * Updates an existing item
   * @param collectionSingular - Singular collection name
   * @param id - Item ID
   * @param updates - Partial updates (will be converted to snake_case)
   * @returns Updated item
   * @throws {Error} On validation errors, not found, or server errors
   * @example
   * const updatedUser = await service.updateItem('user', '123', {
   *   name: 'Jane Doe'
   * });
   */
  async updateItem<T>(
    collectionSingular: string,
    id: string,
    updates: Partial<T>
  ): Promise<T> {
    const url = this.buildItemUrl(collectionSingular, id);
    
    // Convert camelCase to snake_case for Collection DB
    const snakeCaseUpdates = keysToSnakeCase(updates);
    
    logger.debug('Updating item', { collection: collectionSingular, id, updates: snakeCaseUpdates });

    const response = await this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(snakeCaseUpdates),
    });

    if (response.status === 404) {
      logger.warn('Item not found for update', { collection: collectionSingular, id });
      throw new Error(`Item not found: ${collectionSingular}/${id}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to update item', {
        collection: collectionSingular,
        id,
        status: response.status,
        error: errorText,
      });
      
      if (response.status === 400) {
        throw new Error(`Validation error: ${errorText}`);
      }
      throw new Error(`Failed to update item: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    logger.info('Item updated successfully', {
      collection: collectionSingular,
      id,
    });

    return this.parseResponse<T>(result);
  }

  /**
   * Deletes an item from a collection
   * @param collectionSingular - Singular collection name
   * @param id - Item ID
   * @returns True if deleted successfully
   * @throws {Error} On not found or server errors
   * @example
   * const deleted = await service.deleteItem('user', '123');
   * console.log(deleted ? 'Deleted' : 'Failed');
   */
  async deleteItem(collectionSingular: string, id: string): Promise<boolean> {
    const url = this.buildItemUrl(collectionSingular, id);
    
    logger.debug('Deleting item', { collection: collectionSingular, id });

    const response = await this.makeRequest(url, {
      method: 'DELETE',
    });

    if (response.status === 404) {
      logger.warn('Item not found for deletion', { collection: collectionSingular, id });
      throw new Error(`Item not found: ${collectionSingular}/${id}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to delete item', {
        collection: collectionSingular,
        id,
        status: response.status,
        error: errorText,
      });
      throw new Error(`Failed to delete item: ${response.status} ${errorText}`);
    }

    logger.info('Item deleted successfully', {
      collection: collectionSingular,
      id,
    });

    return true;
  }

  /**
   * Queries items with filter support for optimized data retrieval
   * This method uses filter queries to retrieve only matching items from Collection DB
   * @param collectionPlural - Plural collection name
   * @param filter - Array of filter queries
   * @param options - Additional query options
   * @returns Array of filtered items
   * @throws {Error} On server errors
   * @example
   * // Get all bugs for a specific project
   * const bugs = await service.queryItems('bug_tracking_bugss', [
   *   {
   *     field_name: 'payload.project_id',
   *     field_value: 'project123',
   *     operator: 'eq'
   *   }
   * ], { includeDetail: false });
   * 
   * @example
   * // Get all high priority bugs
   * const highPriorityBugs = await service.queryItems('bug_tracking_bugss', [
   *   {
   *     field_name: 'payload.priority',
   *     field_value: 'High',
   *     operator: 'eq'
   *   }
   * ]);
   */
  async queryItems<T>(
    collectionPlural: string,
    filter: FilterQuery[],
    options?: Omit<QueryOptions, 'filter'>
  ): Promise<T[]> {
    if (!filter || filter.length === 0) {
      logger.warn('queryItems called with empty filter, using getAllItems instead');
      return this.getAllItems<T>(collectionPlural, options);
    }

    // Merge filter into options
    const queryOptions: QueryOptions = {
      ...options,
      filter,
    };

    logger.debug('Querying items with filter', {
      collection: collectionPlural,
      filter,
      options,
    });

    return this.getAllItems<T>(collectionPlural, queryOptions);
  }

  /**
   * Lifecycle cleanup method
   * Currently a no-op, but provided for future resource cleanup
   */
  async close(): Promise<void> {
    logger.info('CollectionDBService closed');
  }
}
