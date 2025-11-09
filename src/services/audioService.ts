/**
 * Enhanced audio service for microphone management, VAD, and audio level monitoring
 */

import { LocalAudioTrack, Track } from 'livekit-client';
import { logger } from '../utils/logger';
import { ErrorHandler, AppError } from '../utils/errorHandler';
import { LOG_CONFIG } from '../config/constants';
import type { AudioState } from '../types/api';

export type AudioDeviceInfo = {
  deviceId: string;
  label: string;
  groupId: string;
};

export type AudioLevelData = {
  level: number;
  isSpeaking: boolean;
  timestamp: number;
};

export type AudioServiceEventHandlers = {
  onAudioLevelChanged?: (data: AudioLevelData) => void;
  onDeviceChanged?: (device: AudioDeviceInfo) => void;
  onPermissionChanged?: (hasPermission: boolean) => void;
  onError?: (error: Error) => void;
};

export class AudioService {
  private static instance: AudioService;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private audioTrack: LocalAudioTrack | null = null;
  private levelMonitoringTimer: NodeJS.Timeout | null = null;
  private vadTimer: NodeJS.Timeout | null = null;
  
  // Audio level monitoring
  private currentLevel = 0;
  private isSpeaking = false;
  private speakingThreshold = 0.01; // Adjust based on testing
  private speakingDebounceMs = 300;
  private lastSpeakingTime = 0;
  
  // Device management
  private currentDevice: AudioDeviceInfo | null = null;
  private availableDevices: AudioDeviceInfo[] = [];
  
  // Event handlers
  private eventHandlers: AudioServiceEventHandlers = {};
  
  // State
  private audioState: AudioState = {
    isMuted: true,
    isPublishing: false,
    hasPermission: false,
    audioLevel: 0,
  };

  private constructor() {}

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  /**
   * Set event handlers for audio events
   */
  setEventHandlers(handlers: AudioServiceEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Initialize audio service and request permissions
   */
  async initialize(): Promise<void> {
    logger.info(LOG_CONFIG.TAGS.AUDIO, 'Initializing audio service');

    try {
      // Check if browser supports required APIs
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new AppError('Browser does not support audio capture', 'UNSUPPORTED_BROWSER');
      }

      // Initialize Web Audio API
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Enumerate available devices
      await this.enumerateDevices();
      
      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Audio service initialized successfully');
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to initialize audio service', { error });
      this.eventHandlers.onError?.(error as Error);
      throw ErrorHandler.handle(error, 'audio service initialization');
    }
  }

  /**
   * Request microphone permission and create audio track
   */
  async requestMicrophonePermission(deviceId?: string): Promise<LocalAudioTrack> {
    logger.info(LOG_CONFIG.TAGS.AUDIO, 'Requesting microphone permission', { deviceId });

    try {
      // Create constraints
      const constraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1,
      };

      if (deviceId) {
        constraints.deviceId = { exact: deviceId };
      }

      // Request media stream
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: constraints 
      });

      // Create LiveKit audio track
      this.audioTrack = new LocalAudioTrack(
        this.mediaStream.getAudioTracks()[0],
        undefined,
        true // Enable audio processing
      );

      // Update permission state
      this.updateAudioState({ hasPermission: true });
      this.eventHandlers.onPermissionChanged?.(true);

      // Setup audio analysis
      await this.setupAudioAnalysis();

      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Microphone permission granted and track created');
      return this.audioTrack;

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to get microphone permission', { error });
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          this.updateAudioState({ hasPermission: false });
          this.eventHandlers.onPermissionChanged?.(false);
          throw ErrorHandler.handlePermissionError(error, 'microphone access');
        }
        
        if (error.name === 'NotFoundError') {
          throw new AppError('No microphone device found', 'NO_DEVICE');
        }
      }
      
      throw ErrorHandler.handle(error, 'microphone permission');
    }
  }

  /**
   * Start audio level monitoring and VAD
   */
  startAudioMonitoring(): void {
    if (!this.analyser || this.levelMonitoringTimer) {
      return;
    }

    logger.debug(LOG_CONFIG.TAGS.AUDIO, 'Starting audio level monitoring');

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    this.levelMonitoringTimer = setInterval(() => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS (Root Mean Square) for audio level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i] / 255.0;
        sum += value * value;
      }
      
      const rms = Math.sqrt(sum / bufferLength);
      this.currentLevel = rms;

      // Voice Activity Detection
      const now = Date.now();
      const wasSpeaking = this.isSpeaking;
      
      if (rms > this.speakingThreshold) {
        this.lastSpeakingTime = now;
        this.isSpeaking = true;
      } else if (now - this.lastSpeakingTime > this.speakingDebounceMs) {
        this.isSpeaking = false;
      }

      // Update audio state
      this.updateAudioState({ audioLevel: this.currentLevel });

      // Notify level change
      this.eventHandlers.onAudioLevelChanged?.({
        level: this.currentLevel,
        isSpeaking: this.isSpeaking,
        timestamp: now,
      });

      // Log speaking state changes
      if (wasSpeaking !== this.isSpeaking) {
        logger.debug(LOG_CONFIG.TAGS.AUDIO, `Speaking state changed: ${this.isSpeaking}`);
      }

    }, 50); // 20 FPS for smooth level updates
  }

  /**
   * Stop audio level monitoring
   */
  stopAudioMonitoring(): void {
    if (this.levelMonitoringTimer) {
      clearInterval(this.levelMonitoringTimer);
      this.levelMonitoringTimer = null;
      logger.debug(LOG_CONFIG.TAGS.AUDIO, 'Stopped audio level monitoring');
    }

    if (this.vadTimer) {
      clearInterval(this.vadTimer);
      this.vadTimer = null;
    }
  }

  /**
   * Mute/unmute the audio track
   */
  async setMuted(muted: boolean): Promise<void> {
    logger.debug(LOG_CONFIG.TAGS.AUDIO, `Setting audio muted: ${muted}`);

    try {
      if (this.audioTrack) {
        await this.audioTrack.setMuted(muted);
        this.updateAudioState({ isMuted: muted });
        
        if (muted) {
          this.stopAudioMonitoring();
        } else {
          this.startAudioMonitoring();
        }
      }
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to set mute state', { error, muted });
      throw ErrorHandler.handle(error, 'audio mute');
    }
  }

  /**
   * Switch to a different audio device
   */
  async switchDevice(deviceId: string): Promise<void> {
    logger.info(LOG_CONFIG.TAGS.AUDIO, 'Switching audio device', { deviceId });

    try {
      // Find device info
      const device = this.availableDevices.find(d => d.deviceId === deviceId);
      if (!device) {
        throw new AppError('Audio device not found', 'DEVICE_NOT_FOUND');
      }

      // Stop current monitoring
      this.stopAudioMonitoring();

      // Create new track with the selected device
      const newTrack = await this.requestMicrophonePermission(deviceId);
      
      // Update current device
      this.currentDevice = device;
      this.eventHandlers.onDeviceChanged?.(device);

      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Audio device switched successfully', { 
        deviceLabel: device.label 
      });

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to switch audio device', { error, deviceId });
      throw ErrorHandler.handle(error, 'audio device switch');
    }
  }

  /**
   * Get available audio input devices
   */
  async getAvailableDevices(): Promise<AudioDeviceInfo[]> {
    await this.enumerateDevices();
    return [...this.availableDevices];
  }

  /**
   * Get current audio track
   */
  getCurrentTrack(): LocalAudioTrack | null {
    return this.audioTrack;
  }

  /**
   * Get current audio state
   */
  getAudioState(): AudioState {
    return { ...this.audioState };
  }

  /**
   * Get current audio level (0-1)
   */
  getCurrentLevel(): number {
    return this.currentLevel;
  }

  /**
   * Get current speaking state
   */
  isSpeakingNow(): boolean {
    return this.isSpeaking;
  }

  /**
   * Set speaking threshold for VAD
   */
  setSpeakingThreshold(threshold: number): void {
    this.speakingThreshold = Math.max(0, Math.min(1, threshold));
    logger.debug(LOG_CONFIG.TAGS.AUDIO, 'Speaking threshold updated', { threshold: this.speakingThreshold });
  }

  /**
   * Cleanup audio service
   */
  async cleanup(): Promise<void> {
    logger.info(LOG_CONFIG.TAGS.AUDIO, 'Cleaning up audio service');

    try {
      // Stop monitoring
      this.stopAudioMonitoring();

      // Stop audio track
      if (this.audioTrack) {
        this.audioTrack.stop();
        this.audioTrack = null;
      }

      // Stop media stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        this.audioContext = null;
      }

      // Reset state
      this.updateAudioState({
        isMuted: true,
        isPublishing: false,
        hasPermission: false,
        audioLevel: 0,
      });

      this.analyser = null;
      this.currentDevice = null;

      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Audio service cleanup completed');
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Error during audio service cleanup', { error });
    }
  }

  /**
   * Setup Web Audio API for audio analysis
   */
  private async setupAudioAnalysis(): Promise<void> {
    if (!this.audioContext || !this.mediaStream) {
      throw new AppError('Audio context or media stream not available', 'AUDIO_SETUP_ERROR');
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect media stream to analyser
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);

      logger.debug(LOG_CONFIG.TAGS.AUDIO, 'Audio analysis setup completed');
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to setup audio analysis', { error });
      throw error;
    }
  }

  /**
   * Enumerate available audio input devices
   */
  private async enumerateDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      this.availableDevices = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId,
        }));

      logger.debug(LOG_CONFIG.TAGS.AUDIO, 'Audio devices enumerated', { 
        count: this.availableDevices.length 
      });
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to enumerate audio devices', { error });
      this.availableDevices = [];
    }
  }

  /**
   * Update audio state and notify handlers
   */
  private updateAudioState(newState: Partial<AudioState>): void {
    const oldState = { ...this.audioState };
    this.audioState = { ...this.audioState, ...newState };
    
    // Log state changes
    if (JSON.stringify(oldState) !== JSON.stringify(this.audioState)) {
      logger.debug(LOG_CONFIG.TAGS.AUDIO, 'Audio state updated', { 
        from: oldState, 
        to: this.audioState 
      });
    }
  }
}

// Export singleton instance
export const audioService = AudioService.getInstance();
