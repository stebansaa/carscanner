import { env } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: unknown;
}

/**
 * Structured logger with JSON output
 *
 * @example
 * logger.info('User logged in', { userId: 123 });
 * logger.error('Database error', { error: err, query: 'SELECT...' });
 */
class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.level);
    const requestedIndex = levels.indexOf(level);
    return requestedIndex >= currentIndex;
  }

  private log(level: LogLevel, message: string, meta?: LogMetadata): void {
    if (!this.shouldLog(level)) return;

    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    const output = JSON.stringify(logEntry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  /**
   * Log debug message (lowest priority)
   */
  debug(message: string, meta?: LogMetadata): void {
    this.log('debug', message, meta);
  }

  /**
   * Log informational message
   */
  info(message: string, meta?: LogMetadata): void {
    this.log('info', message, meta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: LogMetadata): void {
    this.log('warn', message, meta);
  }

  /**
   * Log error message (highest priority)
   */
  error(message: string, meta?: LogMetadata): void {
    this.log('error', message, meta);
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger(env.LOG_LEVEL);
