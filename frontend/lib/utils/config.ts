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
  
  // Validate URL format
  try {
    new URL(collectionBaseUrl);
  } catch {
    throw new Error('Invalid APPFLYTE_COLLECTION_BASE_URL: Must be a valid URL');
  }
  
  // Cache and return
  configInstance = {
    collectionBaseUrl: collectionBaseUrl.trim(),
    collectionApiKey: collectionApiKey.trim(),
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
