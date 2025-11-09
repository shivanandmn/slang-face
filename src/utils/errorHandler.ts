/**
 * Centralized error handling utility
 */

import { logger } from './logger';
import { LOG_CONFIG } from '../config/constants';
import type { ApiError } from '../types/api';

export class AppError extends Error {
  public readonly code?: string | number;
  public readonly details?: unknown;
  public readonly userMessage: string;

  constructor(message: string, code?: string | number, details?: unknown, userMessage?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.userMessage = userMessage || this.getDefaultUserMessage(code);
  }

  private getDefaultUserMessage(code?: string | number): string {
    switch (code) {
      case 401:
      case 403:
        return 'Authentication failed. Please try again.';
      case 404:
        return 'The requested resource was not found.';
      case 500:
        return 'A server error occurred. Please try again later.';
      case 'NETWORK_ERROR':
        return 'Network connection failed. Please check your internet connection.';
      case 'PERMISSION_DENIED':
        return 'Microphone permission is required to join the conversation.';
      case 'CONNECTION_FAILED':
        return 'Failed to connect to the room. Please try again.';
      case 'TOKEN_EXPIRED':
        return 'Your session has expired. Please refresh the page.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

export class ErrorHandler {
  static handle(error: unknown, context?: string): AppError {
    logger.error(LOG_CONFIG.TAGS.UI, `Error in ${context || 'unknown context'}`, { error });

    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(
        error.message,
        'UNKNOWN_ERROR',
        error,
        'An unexpected error occurred. Please try again.'
      );
    }

    return new AppError(
      'Unknown error occurred',
      'UNKNOWN_ERROR',
      error,
      'An unexpected error occurred. Please try again.'
    );
  }

  static handleApiError(response: Response, context?: string): AppError {
    const message = `API Error: ${response.status} ${response.statusText}`;
    logger.error(LOG_CONFIG.TAGS.AUTH, `API error in ${context || 'unknown context'}`, {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    });

    return new AppError(message, response.status, { response }, undefined);
  }

  static handleNetworkError(error: unknown, context?: string): AppError {
    logger.error(LOG_CONFIG.TAGS.RTC, `Network error in ${context || 'unknown context'}`, { error });
    
    return new AppError(
      'Network connection failed',
      'NETWORK_ERROR',
      error,
      'Network connection failed. Please check your internet connection.'
    );
  }

  static handlePermissionError(error: unknown, context?: string): AppError {
    logger.error(LOG_CONFIG.TAGS.AUDIO, `Permission error in ${context || 'unknown context'}`, { error });
    
    return new AppError(
      'Permission denied',
      'PERMISSION_DENIED',
      error,
      'Microphone permission is required to join the conversation.'
    );
  }
}

// Utility function to create user-friendly error messages
export function createUserFriendlyError(error: unknown, context?: string): string {
  const appError = ErrorHandler.handle(error, context);
  return appError.userMessage;
}
