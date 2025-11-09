/**
 * Custom hook for audio management with enhanced features
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { audioService, type AudioDeviceInfo, type AudioLevelData } from '../services/audioService';
import { livekitService } from '../services/livekitService';
import { logger } from '../utils/logger';
import { LOG_CONFIG } from '../config/constants';
import type { AudioState } from '../types/api';

export type UseAudioReturn = {
  // State
  audioState: AudioState;
  audioLevel: number;
  isSpeaking: boolean;
  availableDevices: AudioDeviceInfo[];
  currentDevice: AudioDeviceInfo | null;
  isInitialized: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  toggleMute: () => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
  switchDevice: (deviceId: string) => Promise<void>;
  setSpeakingThreshold: (threshold: number) => void;
  cleanup: () => Promise<void>;
  
  // Publishing controls
  startPublishing: () => Promise<void>;
  stopPublishing: () => Promise<void>;
};

export const useAudio = (): UseAudioReturn => {
  const [audioState, setAudioState] = useState<AudioState>({
    isMuted: true,
    isPublishing: false,
    hasPermission: false,
    audioLevel: 0,
  });
  
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<AudioDeviceInfo[]>([]);
  const [currentDevice, setCurrentDevice] = useState<AudioDeviceInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const initializationRef = useRef(false);

  // Handle audio level changes
  const handleAudioLevelChange = useCallback((data: AudioLevelData) => {
    setAudioLevel(data.level);
    setIsSpeaking(data.isSpeaking);
    
    // Update audio state with level
    setAudioState(prev => ({
      ...prev,
      audioLevel: data.level,
    }));
  }, []);

  // Handle device changes
  const handleDeviceChanged = useCallback((device: AudioDeviceInfo) => {
    setCurrentDevice(device);
    logger.debug(LOG_CONFIG.TAGS.AUDIO, 'Current audio device changed', { 
      deviceId: device.deviceId,
      label: device.label 
    });
  }, []);

  // Handle permission changes
  const handlePermissionChanged = useCallback((hasPermission: boolean) => {
    setAudioState(prev => ({
      ...prev,
      hasPermission,
    }));
    
    if (!hasPermission) {
      setError('Microphone permission denied');
    } else {
      setError(null);
    }
  }, []);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    logger.error(LOG_CONFIG.TAGS.AUDIO, 'Audio hook error', { error });
    setError(error.message);
  }, []);

  // Initialize audio service
  const initialize = useCallback(async () => {
    if (initializationRef.current) {
      logger.debug(LOG_CONFIG.TAGS.AUDIO, 'Audio service already initializing or initialized');
      return;
    }

    initializationRef.current = true;
    
    try {
      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Initializing audio service');
      setError(null);

      // Set up event handlers
      audioService.setEventHandlers({
        onAudioLevelChanged: handleAudioLevelChange,
        onDeviceChanged: handleDeviceChanged,
        onPermissionChanged: handlePermissionChanged,
        onError: handleError,
      });

      // Initialize the service
      await audioService.initialize();

      // Load available devices
      const devices = await audioService.getAvailableDevices();
      setAvailableDevices(devices);

      // Get current audio state
      const currentState = audioService.getAudioState();
      setAudioState(currentState);

      setIsInitialized(true);
      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Audio service initialized successfully');

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to initialize audio service', { error });
      setError(error instanceof Error ? error.message : 'Audio initialization failed');
      initializationRef.current = false;
    }
  }, [handleAudioLevelChange, handleDeviceChanged, handlePermissionChanged, handleError]);

  // Toggle mute state
  const toggleMute = useCallback(async () => {
    try {
      const newMutedState = !audioState.isMuted;
      await setMuted(newMutedState);
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to toggle mute', { error });
      throw error;
    }
  }, [audioState.isMuted]);

  // Set mute state
  const setMuted = useCallback(async (muted: boolean) => {
    try {
      logger.debug(LOG_CONFIG.TAGS.AUDIO, 'Setting mute state', { muted });

      // Update local state immediately for responsive UI
      setAudioState(prev => ({ ...prev, isMuted: muted }));

      // Update audio service
      await audioService.setMuted(muted);

      // If we have a LiveKit connection, also update there
      if (audioState.isPublishing) {
        if (muted) {
          await livekitService.disableMicrophone();
        } else {
          await livekitService.enableMicrophone();
        }
      }

      logger.debug(LOG_CONFIG.TAGS.AUDIO, 'Mute state updated successfully', { muted });

    } catch (error) {
      // Revert local state on error
      setAudioState(prev => ({ ...prev, isMuted: !muted }));
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to set mute state', { error, muted });
      throw error;
    }
  }, [audioState.isPublishing]);

  // Switch audio device
  const switchDevice = useCallback(async (deviceId: string) => {
    try {
      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Switching audio device', { deviceId });
      
      await audioService.switchDevice(deviceId);
      
      // If currently publishing, restart with new device
      if (audioState.isPublishing) {
        await stopPublishing();
        await startPublishing();
      }

      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Audio device switched successfully');

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to switch audio device', { error, deviceId });
      throw error;
    }
  }, [audioState.isPublishing]);

  // Start publishing audio
  const startPublishing = useCallback(async () => {
    try {
      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Starting audio publishing');

      // Request microphone permission if not already granted
      if (!audioState.hasPermission) {
        await audioService.requestMicrophonePermission();
      }

      // Enable microphone in LiveKit
      await livekitService.enableMicrophone();

      // Start audio monitoring
      audioService.startAudioMonitoring();

      // Update state
      setAudioState(prev => ({
        ...prev,
        isPublishing: true,
        isMuted: false,
      }));

      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Audio publishing started successfully');

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to start audio publishing', { error });
      throw error;
    }
  }, [audioState.hasPermission]);

  // Stop publishing audio
  const stopPublishing = useCallback(async () => {
    try {
      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Stopping audio publishing');

      // Disable microphone in LiveKit
      await livekitService.disableMicrophone();

      // Stop audio monitoring
      audioService.stopAudioMonitoring();

      // Update state
      setAudioState(prev => ({
        ...prev,
        isPublishing: false,
        isMuted: true,
        audioLevel: 0,
      }));

      setAudioLevel(0);
      setIsSpeaking(false);

      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Audio publishing stopped successfully');

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to stop audio publishing', { error });
      throw error;
    }
  }, []);

  // Set speaking threshold
  const setSpeakingThreshold = useCallback((threshold: number) => {
    audioService.setSpeakingThreshold(threshold);
  }, []);

  // Cleanup audio service
  const cleanup = useCallback(async () => {
    try {
      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Cleaning up audio hook');

      await audioService.cleanup();
      
      // Reset all state
      setAudioState({
        isMuted: true,
        isPublishing: false,
        hasPermission: false,
        audioLevel: 0,
      });
      
      setAudioLevel(0);
      setIsSpeaking(false);
      setAvailableDevices([]);
      setCurrentDevice(null);
      setIsInitialized(false);
      setError(null);
      
      initializationRef.current = false;

      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Audio hook cleanup completed');

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Error during audio hook cleanup', { error });
    }
  }, []);

  // Sync with LiveKit audio state
  useEffect(() => {
    const livekitAudioState = livekitService.getAudioState();
    
    setAudioState(prev => ({
      ...prev,
      isPublishing: livekitAudioState.isPublishing,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isInitialized) {
        cleanup();
      }
    };
  }, [isInitialized, cleanup]);

  return {
    // State
    audioState,
    audioLevel,
    isSpeaking,
    availableDevices,
    currentDevice,
    isInitialized,
    error,
    
    // Actions
    initialize,
    toggleMute,
    setMuted,
    switchDevice,
    setSpeakingThreshold,
    cleanup,
    
    // Publishing controls
    startPublishing,
    stopPublishing,
  };
};
