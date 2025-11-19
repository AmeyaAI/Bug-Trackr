/**
 * Logging utility for consistent application logging
 * Respects DEBUG environment variable
 * Provides structured logging with timestamps
 */

const isDebug = process.env.DEBUG === 'true';

/**
 * Formats log output with timestamp
 */
function formatLog(level: string, message: string, context?: any): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  if (context !== undefined && context !== null && context !== '') {
    return [logMessage, context];
  }
  return [logMessage];
}

export const logger = {
  /**
   * Log error messages (always logged)
   * @param message - Error message
   * @param context - Optional context object or error
   * @example
   * logger.error('Failed to fetch data', { userId: '123', error: err });
   */
  error: (message: string, context?: any) => {
    const args = formatLog('ERROR', message, context);
    console.error(...args);
  },

  /**
   * Log warning messages (always logged)
   * @param message - Warning message
   * @param context - Optional context object
   * @example
   * logger.warn('Deprecated API usage', { endpoint: '/old-api' });
   */
  warn: (message: string, context?: any) => {
    const args = formatLog('WARN', message, context);
    console.warn(...args);
  },

  /**
   * Log info messages (always logged)
   * @param message - Info message
   * @param context - Optional context object
   * @example
   * logger.info('User logged in', { userId: '123' });
   */
  info: (message: string, context?: any) => {
    const args = formatLog('INFO', message, context);
    console.info(...args);
  },

  /**
   * Log debug messages (only when DEBUG=true)
   * @param message - Debug message
   * @param context - Optional context object
   * @example
   * logger.debug('Cache hit', { key: 'user:123', ttl: 300 });
   */
  debug: (message: string, context?: any) => {
    if (isDebug) {
      const args = formatLog('DEBUG', message, context);
      console.debug(...args);
    }
  },
};
