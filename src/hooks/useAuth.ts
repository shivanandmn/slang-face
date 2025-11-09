/**
 * React hook for authentication and session management
 */

import { useState, useEffect, useCallback } from 'react';
import { authService, type UserSession, type AuthEventHandlers } from '../services/authService';
import { logger } from '../utils/logger';
import { LOG_CONFIG } from '../config/constants';
import type { ConnectionState, AudioState } from '../types/api';
import type { ChatMessage } from '../types/chat';
import { AppError } from '../utils/errorHandler';

export type UseAuthReturn = {
  // Session state
  session: UserSession | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: ConnectionState;
  audioState: AudioState;
  
  // Actions
  startSession: (options?: {
    userId?: string;
    userName?: string;
    roomName?: string;
    provider?: string;
    voiceId?: string;
  }) => Promise<void>;
  endSession: () => Promise<void>;
  enableMicrophone: () => Promise<void>;
  disableMicrophone: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  
  // State
  isLoading: boolean;
  error: AppError | null;
  
  // Room info
  roomInfo: ReturnType<typeof authService.getRoomInfo>;
};

export type UseAuthOptions = {
  onSessionStateChanged?: (session: UserSession | null) => void;
  onConnectionStateChanged?: (state: ConnectionState) => void;
  onAudioStateChanged?: (audioState: AudioState) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onError?: (error: AppError) => void;
};

export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  // State
  const [session, setSession] = useState<UserSession | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [audioState, setAudioState] = useState<AudioState>({
    isMuted: true,
    isPublishing: false,
    hasPermission: false,
    audioLevel: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  // Derived state
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';
  const roomInfo = authService.getRoomInfo();

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Start session
  const startSession = useCallback(async (sessionOptions: Parameters<UseAuthReturn['startSession']>[0] = {}) => {
    logger.info(LOG_CONFIG.TAGS.UI, 'Starting session from hook');
    setIsLoading(true);
    clearError();

    try {
      const newSession = await authService.startSession(sessionOptions);
      setSession(newSession);
      logger.info(LOG_CONFIG.TAGS.UI, 'Session started successfully from hook');
    } catch (err) {
      const appError = err instanceof AppError ? err : new AppError('Failed to start session');
      setError(appError);
      logger.error(LOG_CONFIG.TAGS.UI, 'Failed to start session from hook', { error: appError });
      throw appError;
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  // End session
  const endSession = useCallback(async () => {
    logger.info(LOG_CONFIG.TAGS.UI, 'Ending session from hook');
    setIsLoading(true);
    clearError();

    try {
      await authService.endSession();
      setSession(null);
      logger.info(LOG_CONFIG.TAGS.UI, 'Session ended successfully from hook');
    } catch (err) {
      const appError = err instanceof AppError ? err : new AppError('Failed to end session');
      setError(appError);
      logger.error(LOG_CONFIG.TAGS.UI, 'Failed to end session from hook', { error: appError });
      throw appError;
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  // Enable microphone
  const enableMicrophone = useCallback(async () => {
    logger.debug(LOG_CONFIG.TAGS.UI, 'Enabling microphone from hook');
    setIsLoading(true);
    clearError();

    try {
      await authService.enableMicrophone();
      logger.debug(LOG_CONFIG.TAGS.UI, 'Microphone enabled successfully from hook');
    } catch (err) {
      const appError = err instanceof AppError ? err : new AppError('Failed to enable microphone');
      setError(appError);
      logger.error(LOG_CONFIG.TAGS.UI, 'Failed to enable microphone from hook', { error: appError });
      throw appError;
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  // Disable microphone
  const disableMicrophone = useCallback(async () => {
    logger.debug(LOG_CONFIG.TAGS.UI, 'Disabling microphone from hook');
    setIsLoading(true);
    clearError();

    try {
      await authService.disableMicrophone();
      logger.debug(LOG_CONFIG.TAGS.UI, 'Microphone disabled successfully from hook');
    } catch (err) {
      const appError = err instanceof AppError ? err : new AppError('Failed to disable microphone');
      setError(appError);
      logger.error(LOG_CONFIG.TAGS.UI, 'Failed to disable microphone from hook', { error: appError });
      throw appError;
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    logger.debug(LOG_CONFIG.TAGS.UI, 'Sending message from hook');
    clearError();

    try {
      await authService.sendMessage(text);
      logger.debug(LOG_CONFIG.TAGS.UI, 'Message sent successfully from hook');
    } catch (err) {
      const appError = err instanceof AppError ? err : new AppError('Failed to send message');
      setError(appError);
      logger.error(LOG_CONFIG.TAGS.UI, 'Failed to send message from hook', { error: appError });
      throw appError;
    }
  }, [clearError]);

  // Setup event handlers
  useEffect(() => {
    const handlers: AuthEventHandlers = {
      onSessionStateChanged: (newSession) => {
        logger.debug(LOG_CONFIG.TAGS.UI, 'Session state changed in hook', { 
          hasSession: !!newSession,
          connectionState: newSession?.connectionState 
        });
        setSession(newSession);
        options.onSessionStateChanged?.(newSession);
      },

      onConnectionStateChanged: (state) => {
        logger.debug(LOG_CONFIG.TAGS.UI, 'Connection state changed in hook', { state });
        setConnectionState(state);
        options.onConnectionStateChanged?.(state);
      },

      onAudioStateChanged: (state) => {
        logger.debug(LOG_CONFIG.TAGS.UI, 'Audio state changed in hook', { state });
        setAudioState(state);
        options.onAudioStateChanged?.(state);
      },

      onChatMessage: (message) => {
        logger.debug(LOG_CONFIG.TAGS.UI, 'Chat message received in hook', { messageId: message.id });
        options.onChatMessage?.(message);
      },

      onError: (err) => {
        logger.error(LOG_CONFIG.TAGS.UI, 'Error received in hook', { error: err });
        setError(err);
        options.onError?.(err);
      },
    };

    authService.setEventHandlers(handlers);

    // Initialize state from current session
    const currentSession = authService.getCurrentSession();
    if (currentSession) {
      setSession(currentSession);
      setConnectionState(currentSession.connectionState);
      setAudioState(currentSession.audioState);
    }

    // Cleanup function
    return () => {
      // Note: We don't clear handlers here as the service is a singleton
      // and other components might be using it
    };
  }, [options]);

  return {
    // Session state
    session,
    isConnected,
    isConnecting,
    connectionState,
    audioState,
    
    // Actions
    startSession,
    endSession,
    enableMicrophone,
    disableMicrophone,
    sendMessage,
    
    // State
    isLoading,
    error,
    
    // Room info
    roomInfo,
  };
}
