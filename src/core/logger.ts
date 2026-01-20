/**
 * Simple Logger
 *
 * Logs to console and stores in DuckDB for MCP access.
 * Keeps it lean - no complex transport system.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let minLevel: LogLevel = 'info';
const logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * Set minimum log level
 */
export function setLogLevel(level: LogLevel): void {
  minLevel = level;
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[minLevel]) {
    return;
  }

  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date(),
  };

  // Add to buffer
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER_SIZE) {
    logBuffer.shift();
  }

  // Console output
  const timestamp = entry.timestamp.toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  switch (level) {
    case 'debug':
      console.debug(prefix, message, context || '');
      break;
    case 'info':
      console.info(prefix, message, context || '');
      break;
    case 'warn':
      console.warn(prefix, message, context || '');
      break;
    case 'error':
      console.error(prefix, message, context || '');
      break;
  }
}

/**
 * Logger interface
 */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
};

/**
 * Get all log entries from buffer
 */
export function getLogs(): LogEntry[] {
  return [...logBuffer];
}

/**
 * Get logs filtered by level
 */
export function getLogsByLevel(level: LogLevel): LogEntry[] {
  const minLevelNum = LOG_LEVELS[level];
  return logBuffer.filter(entry => LOG_LEVELS[entry.level] >= minLevelNum);
}

/**
 * Get last N log entries
 */
export function getRecentLogs(count: number): LogEntry[] {
  return logBuffer.slice(-count);
}

/**
 * Search logs by message content
 */
export function searchLogs(pattern: string): LogEntry[] {
  const regex = new RegExp(pattern, 'i');
  return logBuffer.filter(entry => regex.test(entry.message));
}

/**
 * Clear log buffer
 */
export function clearLogs(): LogEntry[] {
  const cleared = [...logBuffer];
  logBuffer.length = 0;
  return cleared;
}

/**
 * Format log entry as string
 */
export function formatLogEntry(entry: LogEntry): string {
  const timestamp = entry.timestamp.toISOString();
  const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  return `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${context}`;
}

/**
 * Export logs as formatted text
 */
export function exportLogsAsText(): string {
  return logBuffer.map(formatLogEntry).join('\n');
}

export default logger;
