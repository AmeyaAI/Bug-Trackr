/**
 * Configuration utilities for environment variables
 * Loads and validates required configuration for the application
 */

export interface AppConfig {
  collectionBaseUrl: string;
  collectionApiKey: string;
  debug: boolean;
}

// Singleton instance to avoid repeated validation
let configInstance: AppConfig | null = null;

/**
 * Loads and validates application configuration from environment variables
 * Uses singleton pattern to avoid repeated validation
 * @throws {Error} If required environment variables are missing or invalid
 * @returns {AppConfig} Validated configuration object
 * @example
 * const config = loadConfig();
 * console.log(config.collectionBaseUrl);
 */
export function loadConfig(): AppConfig {
  // Return cached instance if available
  if (configInstance) {
    return configInstance;
  }
  
  const collectionBaseUrl = process.env.APPFLYTE_COLLECTION_BASE_URL;
  const collectionApiKey = process.env.APPFLYTE_COLLECTION_API_KEY;
  
  // Validate required variables
  if (!collectionBaseUrl || collectionBaseUrl.trim() === '') {
    throw new Error('Missing required environment variable: APPFLYTE_COLLECTION_BASE_URL');
  }
  if (!collectionApiKey || collectionApiKey.trim() === '') {
    throw new Error('Missing required environment variable: APPFLYTE_COLLECTION_API_KEY');
  }
  
  // Trim values before validation
  const trimmedUrl = collectionBaseUrl.trim();
  const trimmedApiKey = collectionApiKey.trim();
  
  // Validate URL format
  try {
    new URL(trimmedUrl);
  } catch {
    throw new Error('Invalid APPFLYTE_COLLECTION_BASE_URL: Must be a valid URL');
  }
  
  // Validate API key format (fail fast before making API requests)
  if (trimmedApiKey.length < 10) {
    throw new Error('Invalid APPFLYTE_COLLECTION_API_KEY: API key is too short (minimum 10 characters)');
  }
  
  // Check for valid characters (alphanumeric, hyphens, underscores, dots for JWT tokens)
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedApiKey)) {
    throw new Error('Invalid APPFLYTE_COLLECTION_API_KEY: API key contains invalid characters (only alphanumeric, hyphens, underscores, and dots allowed)');
  }
  
  // Cache and return
  configInstance = {
    collectionBaseUrl: trimmedUrl,
    collectionApiKey: trimmedApiKey,
    debug: process.env.DEBUG === 'true',
  };
  
  return configInstance;
}

/**
 * Checks if configuration is valid without throwing
 * @returns {boolean} True if all required config is present
 * @example
 * if (isConfigValid()) {
 *   const config = loadConfig();
 * }
 */
export function isConfigValid(): boolean {
  try {
    loadConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Resets the cached configuration instance
 * Useful for testing or when environment variables change
 * @example
 * resetConfig(); // Force reload on next loadConfig() call
 */
export function resetConfig(): void {
  configInstance = null;
}
