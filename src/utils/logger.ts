/**
 * Structured logging utility with PII redaction
 */

import { LOG_CONFIG, ENV, type LogLevel, type LogTag } from '../config/constants';

class Logger {
  private level: LogLevel;

  constructor() {
    this.level = (ENV.VITE_LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = LOG_CONFIG.LEVELS;
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, tag: LogTag, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${tag}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(this.redactPII(data))}`;
    }
    return `${prefix} ${message}`;
  }

  private redactPII(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const redacted = { ...data } as Record<string, unknown>;
    
    // Redact JWT tokens
    if ('token' in redacted && typeof redacted.token === 'string') {
      redacted.token = this.maskString(redacted.token);
    }
    
    // Redact participant IDs (keep first few chars)
    if ('participantId' in redacted && typeof redacted.participantId === 'string') {
      redacted.participantId = this.maskString(redacted.participantId, 4);
    }
    
    // Redact user IDs
    if ('userId' in redacted && typeof redacted.userId === 'string') {
      redacted.userId = this.maskString(redacted.userId, 4);
    }

    return redacted;
  }

  private maskString(str: string, keepChars = LOG_CONFIG.PII_MASK_LENGTH): string {
    if (str.length <= keepChars) {
      return '*'.repeat(str.length);
    }
    return str.substring(0, keepChars) + '*'.repeat(Math.min(8, str.length - keepChars));
  }

  debug(tag: LogTag, message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', tag, message, data));
    }
  }

  info(tag: LogTag, message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', tag, message, data));
    }
  }

  warn(tag: LogTag, message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', tag, message, data));
    }
  }

  error(tag: LogTag, message: string, data?: unknown): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', tag, message, data));
    }
  }
}

export const logger = new Logger();
