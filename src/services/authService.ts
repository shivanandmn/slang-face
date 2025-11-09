/**
 * Authentication service for user session management
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { ErrorHandler, AppError } from '../utils/errorHandler';
import { tokenService } from './tokenService';
import { livekitService } from './livekitService';
import { chatService } from './chatService';
import { LOG_CONFIG } from '../config/constants';
import type { ConnectionState, AudioState } from '../types/api';
import type { ChatMessage } from '../types/chat';

export type UserSession = {
  userId: string;
  userName?: string;
  roomName?: string;
  joinedAt: number;
  connectionState: ConnectionState;
  audioState: AudioState;
};

export type AuthEventHandlers = {
  onSessionStateChanged?: (session: UserSession) => void;
  onConnectionStateChanged?: (state: ConnectionState) => void;
  onAudioStateChanged?: (audioState: AudioState) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onError?: (error: AppError) => void;
};

export class AuthService {
  private static instance: AuthService;
  private currentSession: UserSession | null = null;
  private eventHandlers: AuthEventHandlers = {};

  private constructor() {
    this.setupLiveKitEventHandlers();
    this.setupChatServiceEventHandlers();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Set event handlers for authentication events
   */
  setEventHandlers(handlers: AuthEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Start a new user session and join room
   */
  async startSession(options: {
    userId?: string;
    userName?: string;
    roomName?: string;
    provider?: string;
    voiceId?: string;
  } = {}): Promise<UserSession> {
    logger.info(LOG_CONFIG.TAGS.AUTH, 'Starting new user session', { 
      userId: options.userId,
      userName: options.userName,
      roomName: options.roomName 
    });

    try {
      // Generate user ID if not provided
      const userId = options.userId || this.generateUserId();
      const userName = options.userName || `User ${userId.slice(0, 6)}`;
      const roomName = options.roomName || 'default-room';

      // Create session
      this.currentSession = {
        userId,
        userName,
        roomName,
        joinedAt: Date.now(),
        connectionState: 'disconnected',
        audioState: {
          isMuted: true,
          isPublishing: false,
          hasPermission: false,
          audioLevel: 0,
        },
      };

      // Initialize ChatService with user ID
      chatService.initialize(userId);

      // Connect to LiveKit room
      await livekitService.connect(userId, roomName);

      // Update session state
      this.updateSessionState({
        connectionState: livekitService.getConnectionState(),
        audioState: livekitService.getAudioState(),
      });

      logger.info(LOG_CONFIG.TAGS.AUTH, 'User session started successfully', {
        userId,
        roomName,
        connectionState: this.currentSession.connectionState,
      });

      this.notifySessionStateChanged();
      return { ...this.currentSession };

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUTH, 'Failed to start user session', { error });
      
      // Clean up on failure
      this.currentSession = null;
      
      const appError = ErrorHandler.handle(error, 'session start');
      this.eventHandlers.onError?.(appError);
      throw appError;
    }
  }

  /**
   * End current user session
   */
  async endSession(): Promise<void> {
    logger.info(LOG_CONFIG.TAGS.AUTH, 'Ending user session');

    try {
      if (!this.currentSession) {
        logger.warn(LOG_CONFIG.TAGS.AUTH, 'No active session to end');
        return;
      }

      const sessionDuration = Date.now() - this.currentSession.joinedAt;
      
      // Disconnect from LiveKit
      await livekitService.disconnect();

      // Cleanup ChatService
      chatService.cleanup();

      // Clear session
      const endedSession = { ...this.currentSession };
      this.currentSession = null;

      logger.info(LOG_CONFIG.TAGS.AUTH, 'User session ended', {
        userId: endedSession.userId,
        duration: sessionDuration,
      });

      this.notifySessionStateChanged();

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUTH, 'Error ending user session', { error });
      
      // Force clear session even on error
      this.currentSession = null;
      this.notifySessionStateChanged();
      
      const appError = ErrorHandler.handle(error, 'session end');
      this.eventHandlers.onError?.(appError);
      throw appError;
    }
  }

  /**
   * Enable microphone for current session
   */
  async enableMicrophone(): Promise<void> {
    logger.info(LOG_CONFIG.TAGS.AUTH, 'Enabling microphone for session');

    try {
      if (!this.currentSession) {
        throw new AppError('No active session', 'NO_SESSION');
      }

      await livekitService.enableMicrophone();
      
      // Update session audio state
      this.updateSessionState({
        audioState: livekitService.getAudioState(),
      });

      logger.info(LOG_CONFIG.TAGS.AUTH, 'Microphone enabled for session');
      this.notifySessionStateChanged();

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUTH, 'Failed to enable microphone', { error });
      const appError = ErrorHandler.handle(error, 'microphone enable');
      this.eventHandlers.onError?.(appError);
      throw appError;
    }
  }

  /**
   * Disable microphone for current session
   */
  async disableMicrophone(): Promise<void> {
    logger.info(LOG_CONFIG.TAGS.AUTH, 'Disabling microphone for session');

    try {
      if (!this.currentSession) {
        throw new AppError('No active session', 'NO_SESSION');
      }

      await livekitService.disableMicrophone();
      
      // Update session audio state
      this.updateSessionState({
        audioState: livekitService.getAudioState(),
      });

      logger.info(LOG_CONFIG.TAGS.AUTH, 'Microphone disabled for session');
      this.notifySessionStateChanged();

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUTH, 'Failed to disable microphone', { error });
      const appError = ErrorHandler.handle(error, 'microphone disable');
      this.eventHandlers.onError?.(appError);
      throw appError;
    }
  }

  /**
   * Send chat message via ChatService
   */
  async sendMessage(text: string): Promise<string> {
    logger.debug(LOG_CONFIG.TAGS.CHAT, 'Sending message from auth service');

    try {
      if (!this.currentSession) {
        throw new AppError('No active session', 'NO_SESSION');
      }

      // Use the new ChatService for sending messages
      const messageId = await chatService.sendMessage(text);
      
      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Message sent via ChatService', { messageId });
      
      return messageId;

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.CHAT, 'Failed to send message via ChatService', { error });
      const appError = ErrorHandler.handle(error, 'message send');
      this.eventHandlers.onError?.(appError);
      throw appError;
    }
  }

  /**
   * Get current session information
   */
  getCurrentSession(): UserSession | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Check if user has an active session
   */
  hasActiveSession(): boolean {
    return !!this.currentSession && this.currentSession.connectionState === 'connected';
  }

  /**
   * Get room information from LiveKit service
   */
  getRoomInfo() {
    return livekitService.getRoomInfo();
  }

  /**
   * Generate a unique user ID
   */
  private generateUserId(): string {
    return `user_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  }

  /**
   * Update session state
   */
  private updateSessionState(updates: Partial<UserSession>): void {
    if (!this.currentSession) return;

    const oldState = { ...this.currentSession };
    this.currentSession = { ...this.currentSession, ...updates };

    // Log significant state changes
    if (oldState.connectionState !== this.currentSession.connectionState) {
      logger.info(LOG_CONFIG.TAGS.AUTH, 'Session connection state changed', {
        from: oldState.connectionState,
        to: this.currentSession.connectionState,
      });
    }
  }

  /**
   * Notify handlers of session state changes
   */
  private notifySessionStateChanged(): void {
    if (this.currentSession) {
      this.eventHandlers.onSessionStateChanged?.(this.currentSession);
    }
  }

  /**
   * Setup event handlers for ChatService
   */
  private setupChatServiceEventHandlers(): void {
    chatService.setEventHandlers({
      onMessageReceived: (message) => {
        logger.debug(LOG_CONFIG.TAGS.CHAT, 'Chat message received via ChatService', { 
          messageId: message.id 
        });
        this.eventHandlers.onChatMessage?.(message);
      },
      
      onMessageSent: (message) => {
        logger.debug(LOG_CONFIG.TAGS.CHAT, 'Chat message sent via ChatService', { 
          messageId: message.id 
        });
        // Could add local echo handling here if needed
      },
      
      onError: (error) => {
        logger.error(LOG_CONFIG.TAGS.CHAT, 'ChatService error', { error });
        const appError = ErrorHandler.handle(error, 'ChatService');
        this.eventHandlers.onError?.(appError);
      },
    });
  }

  /**
   * Setup event handlers for LiveKit service
   */
  private setupLiveKitEventHandlers(): void {
    livekitService.setEventHandlers({
      onConnectionStateChanged: (state) => {
        logger.debug(LOG_CONFIG.TAGS.AUTH, 'LiveKit connection state changed', { state });
        
        if (this.currentSession) {
          this.updateSessionState({ connectionState: state });
          this.notifySessionStateChanged();
        }
        
        this.eventHandlers.onConnectionStateChanged?.(state);
      },

      onAudioStateChanged: (audioState) => {
        logger.debug(LOG_CONFIG.TAGS.AUTH, 'LiveKit audio state changed', { audioState });
        
        if (this.currentSession) {
          this.updateSessionState({ audioState });
          this.notifySessionStateChanged();
        }
        
        this.eventHandlers.onAudioStateChanged?.(audioState);
      },

      // DataChannel handling is now managed by ChatService
      onDataReceived: (payload, participant) => {
        // ChatService will handle all DataChannel messages
        logger.debug(LOG_CONFIG.TAGS.CHAT, 'DataChannel message received - handled by ChatService');
      },

      onError: (error) => {
        logger.error(LOG_CONFIG.TAGS.AUTH, 'LiveKit service error', { error });
        const appError = ErrorHandler.handle(error, 'LiveKit service');
        this.eventHandlers.onError?.(appError);
      },
    });
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
