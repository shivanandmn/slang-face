/**
 * Token management service for LiveKit authentication
 */

import { logger } from '../utils/logger';
import { ErrorHandler, AppError } from '../utils/errorHandler';
import { API_ENDPOINTS, LIVEKIT_CONFIG, APP_CONFIG, LOG_CONFIG } from '../config/constants';
import type { TokenRequest, TokenResponse } from '../types/api';

export class TokenService {
  private static instance: TokenService;
  private currentToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Request a new token from the backend API
   */
  async requestToken(userId: string, options?: Partial<TokenRequest>): Promise<TokenResponse> {
    logger.info(LOG_CONFIG.TAGS.AUTH, 'Requesting new token', { userId });

    const params = new URLSearchParams({
      provider: options?.provider || LIVEKIT_CONFIG.DEFAULT_PROVIDER,
      voice_id: options?.voice_id || LIVEKIT_CONFIG.DEFAULT_VOICE_ID,
    });

    const url = `${API_ENDPOINTS.TOKEN_URL}?${params.toString()}`;

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
      });

      if (!response.ok) {
        throw ErrorHandler.handleApiError(response, 'token request');
      }

      const tokenData: TokenResponse = await response.json();
      
      // Validate token response
      if (!tokenData.token) {
        throw new AppError('Invalid token response', 'INVALID_TOKEN', tokenData);
      }

      // Store token and set up refresh if expiry is provided
      this.currentToken = tokenData.token;
      if (tokenData.expires_at) {
        this.tokenExpiresAt = tokenData.expires_at;
        this.scheduleTokenRefresh(userId, options);
      }

      logger.info(LOG_CONFIG.TAGS.AUTH, 'Token received successfully', {
        hasToken: !!tokenData.token,
        expiresAt: tokenData.expires_at,
      });

      return tokenData;
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUTH, 'Token request failed', { error, userId });
      throw ErrorHandler.handle(error, 'token request');
    }
  }

  /**
   * Get current token or request a new one if needed
   */
  async getValidToken(userId: string, options?: Partial<TokenRequest>): Promise<string> {
    // Check if current token is still valid
    if (this.currentToken && this.isTokenValid()) {
      logger.debug(LOG_CONFIG.TAGS.AUTH, 'Using existing valid token');
      return this.currentToken;
    }

    // Request new token
    logger.info(LOG_CONFIG.TAGS.AUTH, 'Current token invalid or missing, requesting new token');
    const tokenResponse = await this.requestToken(userId, options);
    return tokenResponse.token;
  }

  /**
   * Check if current token is still valid (not expired)
   */
  private isTokenValid(): boolean {
    if (!this.currentToken || !this.tokenExpiresAt) {
      return false;
    }

    const now = Date.now();
    const bufferTime = APP_CONFIG.TOKEN_REFRESH_BUFFER;
    return now < (this.tokenExpiresAt - bufferTime);
  }

  /**
   * Schedule automatic token refresh before expiry
   */
  private scheduleTokenRefresh(userId: string, options?: Partial<TokenRequest>): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.tokenExpiresAt) {
      return;
    }

    const now = Date.now();
    const refreshTime = this.tokenExpiresAt - APP_CONFIG.TOKEN_REFRESH_BUFFER;
    const delay = Math.max(0, refreshTime - now);

    logger.debug(LOG_CONFIG.TAGS.AUTH, 'Scheduling token refresh', {
      refreshIn: delay,
      expiresAt: this.tokenExpiresAt,
    });

    this.refreshTimer = setTimeout(async () => {
      try {
        logger.info(LOG_CONFIG.TAGS.AUTH, 'Auto-refreshing token');
        await this.requestToken(userId, options);
      } catch (error) {
        logger.error(LOG_CONFIG.TAGS.AUTH, 'Auto token refresh failed', { error });
      }
    }, delay);
  }

  /**
   * Fetch with retry logic for network resilience
   */
  private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error | null = null;
    let delay = APP_CONFIG.RETRY_BASE_DELAY;

    for (let attempt = 1; attempt <= APP_CONFIG.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        logger.debug(LOG_CONFIG.TAGS.AUTH, `Token request attempt ${attempt}/${APP_CONFIG.MAX_RETRY_ATTEMPTS}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.CONNECTION_TIMEOUT);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === APP_CONFIG.MAX_RETRY_ATTEMPTS) {
          break;
        }

        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            logger.warn(LOG_CONFIG.TAGS.AUTH, `Request timeout on attempt ${attempt}`);
          } else if (error.message.includes('NetworkError')) {
            logger.warn(LOG_CONFIG.TAGS.AUTH, `Network error on attempt ${attempt}`);
          } else {
            // For other errors, don't retry
            break;
          }
        }

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 250));
        delay = Math.min(delay * 2, 8000);
      }
    }

    throw ErrorHandler.handleNetworkError(lastError, 'token fetch');
  }

  /**
   * Clear current token and cancel refresh timer
   */
  clearToken(): void {
    logger.info(LOG_CONFIG.TAGS.AUTH, 'Clearing token');
    this.currentToken = null;
    this.tokenExpiresAt = null;
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Get current token without validation (for debugging)
   */
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  /**
   * Check if service has a token
   */
  hasToken(): boolean {
    return !!this.currentToken;
  }
}

// Export singleton instance
export const tokenService = TokenService.getInstance();
