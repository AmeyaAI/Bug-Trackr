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
  field_value: string | number | boolean | null | unknown[];
  /** Comparison operator */
  operator: 'eq' | 'like';
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
  private readonly apiKeyProvider: () => string | null;
  private readonly timeout: number;

  /**
   * Creates a new Collection DB Service instance
   * @param baseUrl - Base URL for Collection DB (e.g., https://.../.../dpdo_bug_tracker)
   * @param apiKeyOrProvider - API key string or function that returns the key/token
   * @param timeout - Request timeout in milliseconds (default: 60000)
   */
  constructor(baseUrl: string, apiKeyOrProvider: string | (() => string | null), timeout: number = 60000) {
    if (!baseUrl || baseUrl.trim() === '') {
      throw new Error('Collection DB base URL is required');
    }
    
    if (!apiKeyOrProvider) {
      throw new Error('Collection DB API key or provider is required');
    }

    if (timeout <= 0) {
      throw new Error('Timeout must be positive');
    }

    this.baseUrl = baseUrl.trim().replace(/\/$/, ''); // Remove trailing slash
    
    if (typeof apiKeyOrProvider === 'string') {
      const key = apiKeyOrProvider.trim();
      if (key === '') throw new Error('Collection DB API key cannot be empty');
      this.apiKeyProvider = () => key;
    } else {
      this.apiKeyProvider = apiKeyOrProvider;
    }

    this.timeout = timeout;

    logger.info('CollectionDBService initialized');
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
      // Add aliases for compatibility with different backend conventions
      params.append('limit', pageSize.toString());
      params.append('pageSize', pageSize.toString());
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
      params.append('filters', filterJson);
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
      const apiKey = this.apiKeyProvider();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers as Record<string, string>,
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
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
   * 
   * ID Handling:
   * - Extracts __auto_id__ from Collection DB response as the primary ID
   * - Converts it to 'id' field in the returned object
   * - If data already contains an 'id' field that differs from __auto_id__, 
   *   logs a warning and uses __auto_id__ as the authoritative source
   * 
   * @param response - Raw Collection DB response
   * @returns Parsed and transformed item with 'id' field
   * @private
   */
  private parseResponse<T>(response: CollectionDBResponse<unknown>): T {
    // Extract payload if nested
    const data = response.payload || response;
    
    // Extract __auto_id__ as the primary ID
    const dataWithId = data as Record<string, unknown>;
    const autoId = response.__auto_id__ || dataWithId.__auto_id__;
    
    // Convert snake_case to camelCase
    const camelCaseData = keysToCamelCase(data);
    
    // Handle ID injection with conflict detection
    if (autoId) {
      // Always use __auto_id__ as the authoritative ID
      return { ...camelCaseData, id: autoId } as T;
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
    
    // Wrap data in collection_item as required by Collection DB API
    const requestBody = {
      collection_item: snakeCaseData
    };
    
    logger.debug('Creating item', { collection: collectionPlural, data: snakeCaseData });

    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, 'create item', collectionPlural);
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
      await this.handleErrorResponse(response, 'fetch items', collectionPlural);
    }

    const result = await response.json();
    
    // Collection DB response format:
    // {
    //   "Collection": "collection_name",
    //   "last_evaluated_key": null,
    //   "<uuid>": [ array of items ],
    //   "published_collections_detail": [...]
    // }
    
    let items: unknown[] = [];
    
    if (Array.isArray(result)) {
      // Direct array response
      items = result;
    } else if (result && typeof result === 'object') {
      // Find the UUID key that contains the items array
      const keys = Object.keys(result);
      for (const key of keys) {
        // Skip known metadata keys
        if (key === 'Collection' || key === 'last_evaluated_key' || key === 'published_collections_detail') {
          continue;
        }
        // Check if this key contains an array (the actual items)
        if (Array.isArray(result[key])) {
          items = result[key];
          logger.debug('Found items in UUID key', { 
            collection: collectionPlural, 
            uuidKey: key,
            count: items.length 
          });
          break;
        }
      }
      
      // Fallback to items property if no UUID key found
      if (items.length === 0 && result.items) {
        items = result.items;
      }
    }
    
    logger.info('Items fetched successfully', {
      collection: collectionPlural,
      count: items.length,
    });

    return items.map((item: unknown) => this.parseResponse<T>(item as CollectionDBResponse<unknown>));
  }

  /**
   * Retrieves items from a collection with pagination info
   * @param collectionPlural - Plural collection name
   * @param options - Query options for filtering and pagination
   * @returns Object containing items and lastEvaluatedKey
   */
  async getAllItemsPaginated<T>(collectionPlural: string, options?: QueryOptions): Promise<{ items: T[], lastEvaluatedKey: Record<string, unknown> | null }> {
    const params = this.buildQueryParams(options);
    const url = `${this.buildListUrl(collectionPlural)}?${params.toString()}`;
    
    logger.debug('Fetching paginated items', { collection: collectionPlural, options });

    const response = await this.makeRequest(url, {
      method: 'GET',
    });

    if (!response.ok) {
      await this.handleErrorResponse(response, 'fetch items', collectionPlural);
    }

    const result = await response.json();
    
    let items: unknown[] = [];
    let lastEvaluatedKey: Record<string, unknown> | null = null;
    
    if (Array.isArray(result)) {
      // Direct array response
      items = result;
    } else if (result && typeof result === 'object') {
      // Extract last_evaluated_key
      if (result.last_evaluated_key) {
        lastEvaluatedKey = result.last_evaluated_key as Record<string, unknown>;
      }

      // Find the UUID key that contains the items array
      const keys = Object.keys(result);
      for (const key of keys) {
        // Skip known metadata keys
        if (key === 'Collection' || key === 'last_evaluated_key' || key === 'published_collections_detail') {
          continue;
        }
        // Check if this key contains an array (the actual items)
        if (Array.isArray(result[key])) {
          items = result[key];
          logger.debug('Found items in UUID key', { 
            collection: collectionPlural, 
            uuidKey: key,
            count: items.length 
          });
          break;
        }
      }
      
      // Fallback to items property if no UUID key found
      if (items.length === 0 && result.items) {
        items = result.items;
      }
    }
    
    logger.info('Items fetched successfully', {
      collection: collectionPlural,
      count: items.length,
      hasMore: !!lastEvaluatedKey
    });

    return {
      items: items.map((item: unknown) => this.parseResponse<T>(item as CollectionDBResponse<unknown>)),
      lastEvaluatedKey
    };
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
      await this.handleErrorResponse(response, 'fetch item', collectionSingular, id);
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
   * @param fetchAfterUpdate - Whether to fetch the updated item after update (default: true)
   * @returns Updated item (or partial item if fetchAfterUpdate is false)
   * @throws {Error} On validation errors, not found, or server errors
   * @example
   * const updatedUser = await service.updateItem('user', '123', {
   *   name: 'Jane Doe'
   * });
   */
  async updateItem<T>(
    collectionSingular: string,
    id: string,
    updates: Partial<T>,
    fetchAfterUpdate: boolean = true
  ): Promise<T> {
    const url = this.buildItemUrl(collectionSingular, id);
    
    // Convert camelCase to snake_case for Collection DB
    const snakeCaseUpdates = keysToSnakeCase(updates);
    
    // Convert updates to Collection DB fields format
    // Format: { "id": "item_id", "fields": [{ "path": "$.field", "value": value }] }
    const fields = Object.entries(snakeCaseUpdates).map(([key, value]) => ({
      path: `$.${key}`,
      value: value
    }));
    
    const requestBody = {
      id: id,
      fields: fields
    };
    
    logger.debug('Updating item', { collection: collectionSingular, id, updates: snakeCaseUpdates });

    const response = await this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(requestBody),
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

    if (!fetchAfterUpdate) {
      logger.info('Item updated successfully, skipping fetch', {
        collection: collectionSingular,
        id,
      });
      // Return the updates merged with ID as a best-effort result
      // Note: This is not the full item, but satisfies the Promise<T> signature for now
      // The caller should handle merging if needed
      return { ...updates, id } as unknown as T;
    }

    // Update successful - now fetch the updated item
    // Collection DB UPDATE may not return the full item, so we fetch it
    logger.info('Item updated successfully, fetching updated item', {
      collection: collectionSingular,
      id,
    });

    return this.getItemById<T>(collectionSingular, id) as Promise<T>;
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
   * Queries items with filter support and pagination
   * @param collectionPlural - Plural collection name
   * @param filter - Array of filter queries
   * @param options - Additional query options
   * @returns Object containing items and lastEvaluatedKey
   */
  async queryItemsPaginated<T>(
    collectionPlural: string,
    filter: FilterQuery[],
    options?: Omit<QueryOptions, 'filter'>
  ): Promise<{ items: T[], lastEvaluatedKey: Record<string, unknown> | null }> {
    if (!filter || filter.length === 0) {
      return this.getAllItemsPaginated<T>(collectionPlural, options);
    }

    // Merge filter into options
    const queryOptions: QueryOptions = {
      ...options,
      filter,
    };

    logger.debug('Querying paginated items with filter', {
      collection: collectionPlural,
      filter,
      options,
    });

    return this.getAllItemsPaginated<T>(collectionPlural, queryOptions);
  }

  /**
   * Lifecycle cleanup method
   * Currently a no-op, but provided for future resource cleanup
   */
  async close(): Promise<void> {
    logger.info('CollectionDBService closed');
  }
}
