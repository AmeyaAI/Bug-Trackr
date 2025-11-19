/**
 * Logging utility for consistent application logging
 * Respects DEBUG environment variable
 * Provides structured logging with timestamps
 * Automatically sanitizes PII (Personally Identifiable Information)
 */

const isDebug = process.env.DEBUG === 'true';

/**
 * List of PII field names that should be masked in logs
 */
const PII_FIELDS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'phoneNumber',
  'phone_number',
  'email',
  'ssn',
  'creditCard',
  'credit_card',
  'authorization',
  'cookie',
];

/**
 * Masks a string value for logging (shows first 2 and last 2 characters)
 * @param value - String to mask
 * @returns Masked string
 */
function maskValue(value: string): string {
  if (!value || value.length <= 4) {
    return '***';
  }
  return `${value.substring(0, 2)}${'*'.repeat(value.length - 4)}${value.substring(value.length - 2)}`;
}

/**
 * Sanitizes an object by masking PII fields
 * @param obj - Object to sanitize
 * @returns Sanitized copy of the object
 */
function sanitizePII(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizePII(item));
  }

  // Handle Error objects specially
  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: isDebug ? obj.stack : '[REDACTED]',
    };
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj;
  }

  // Handle regular objects
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if this is a PII field
    const isPII = PII_FIELDS.some(field => lowerKey.includes(field.toLowerCase()));
    
    if (isPII && typeof value === 'string') {
      sanitized[key] = maskValue(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizePII(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Formats log output with timestamp and sanitizes PII
 * @returns Array of log arguments for console methods
 */
function formatLog(level: string, message: string, context?: any): [string] | [string, any] {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  if (context !== undefined && context !== null && context !== '') {
    // Sanitize context to remove PII
    const sanitizedContext = sanitizePII(context);
    return [logMessage, sanitizedContext];
  }
  return [logMessage];
}

/**
 * Check if console methods are available (browser compatibility)
 */
const hasConsole = typeof console !== 'undefined';

export const logger = {
  /**
   * Log error messages (always logged)
   * Automatically sanitizes PII in context
   * @param message - Error message
   * @param context - Optional context object or error (PII will be masked)
   * @example
   * logger.error('Failed to fetch data', { userId: '123', error: err });
   * logger.error('Auth failed', { email: 'user@example.com' }); // email will be masked
   */
  error: (message: string, context?: any) => {
    if (!hasConsole) return;
    const args = formatLog('ERROR', message, context);
    console.error(...args);
  },

  /**
   * Log warning messages (always logged)
   * Automatically sanitizes PII in context
   * @param message - Warning message
   * @param context - Optional context object (PII will be masked)
   * @example
   * logger.warn('Deprecated API usage', { endpoint: '/old-api' });
   */
  warn: (message: string, context?: any) => {
    if (!hasConsole) return;
    const args = formatLog('WARN', message, context);
    console.warn(...args);
  },

  /**
   * Log info messages (always logged)
   * Automatically sanitizes PII in context
   * @param message - Info message
   * @param context - Optional context object (PII will be masked)
   * @example
   * logger.info('User logged in', { userId: '123' });
   */
  info: (message: string, context?: any) => {
    if (!hasConsole) return;
    const args = formatLog('INFO', message, context);
    console.info(...args);
  },

  /**
   * Log debug messages (only when DEBUG=true)
   * Automatically sanitizes PII in context
   * @param message - Debug message
   * @param context - Optional context object (PII will be masked)
   * @example
   * logger.debug('Cache hit', { key: 'user:123', ttl: 300 });
   */
  debug: (message: string, context?: any) => {
    if (!hasConsole || !isDebug) return;
    const args = formatLog('DEBUG', message, context);
    console.debug(...args);
  },

  /**
   * Log without PII sanitization (USE WITH EXTREME CAUTION)
   * Only use in development for debugging specific issues
   * NEVER use in production code
   * @param level - Log level
   * @param message - Log message
   * @param context - Raw context (NOT sanitized)
   * @example
   * // Only for local debugging
   * if (process.env.NODE_ENV === 'development') {
   *   logger.unsafe('DEBUG', 'Raw user data', userData);
   * }
   */
  unsafe: (level: string, message: string, context?: any) => {
    if (!hasConsole) return;
    if (process.env.NODE_ENV === 'production') {
      console.warn('[LOGGER] Unsafe logging is disabled in production');
      return;
    }
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] [UNSAFE] ${message}`;
    console.log(logMessage, context || '');
  },
};
