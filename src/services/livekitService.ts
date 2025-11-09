/**
 * LiveKit connection service for room management and WebRTC
 */

import { 
  Room, 
  RoomEvent, 
  ConnectionState as LiveKitConnectionState,
  RoomOptions,
  VideoPresets,
  Track,
  LocalTrack,
  RemoteTrack,
  LocalAudioTrack,
  Participant,
  DataPacket_Kind,
  RoomConnectOptions
} from 'livekit-client';

import { logger } from '../utils/logger';
import { ErrorHandler, AppError } from '../utils/errorHandler';
import { tokenService } from './tokenService';
import { API_ENDPOINTS, LIVEKIT_CONFIG, APP_CONFIG, LOG_CONFIG } from '../config/constants';
import type { ConnectionState, AudioState } from '../types/api';
import type { ChatMessage } from '../types/chat';

export type LiveKitEventHandlers = {
  onConnectionStateChanged?: (state: ConnectionState) => void;
  onParticipantConnected?: (participant: Participant) => void;
  onParticipantDisconnected?: (participant: Participant) => void;
  onTrackSubscribed?: (track: RemoteTrack, participant: Participant) => void;
  onTrackUnsubscribed?: (track: RemoteTrack, participant: Participant) => void;
  onDataReceived?: (payload: Uint8Array, participant?: Participant) => void;
  onAudioStateChanged?: (audioState: AudioState) => void;
  onSpeakingChanged?: (participant: Participant, isSpeaking: boolean) => void;
  onActiveSpeakersChanged?: (speakers: Participant[]) => void;
  onError?: (error: Error) => void;
};

export class LiveKitService {
  private static instance: LiveKitService;
  private room: Room | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private audioState: AudioState = {
    isMuted: true,
    isPublishing: false,
    hasPermission: false,
    audioLevel: 0,
  };
  private eventHandlers: LiveKitEventHandlers = {};
  private audioLevelTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  private constructor() {}

  static getInstance(): LiveKitService {
    if (!LiveKitService.instance) {
      LiveKitService.instance = new LiveKitService();
    }
    return LiveKitService.instance;
  }

  /**
   * Set event handlers for room events
   */
  setEventHandlers(handlers: LiveKitEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Connect to LiveKit room
   */
  async connect(userId: string, roomName?: string): Promise<void> {
    logger.info(LOG_CONFIG.TAGS.RTC, 'Initiating LiveKit connection', { userId, roomName });

    try {
      // Get valid token
      const token = await tokenService.getValidToken(userId);
      
      // Create room if not exists
      if (!this.room) {
        this.room = new Room(this.getRoomOptions());
        this.setupRoomEventListeners();
      }

      // Set connection state
      this.updateConnectionState('connecting');

      // Connect to room
      const connectOptions: RoomConnectOptions = {
        autoSubscribe: true,
      };

      await this.room.connect(API_ENDPOINTS.LIVEKIT_URL, token, connectOptions);
      
      logger.info(LOG_CONFIG.TAGS.RTC, 'Connected to LiveKit room', {
        roomName: this.room.name,
        participantCount: this.room.numParticipants,
      });

      this.updateConnectionState('connected');
      this.reconnectAttempts = 0;

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.RTC, 'Failed to connect to LiveKit room', { error });
      this.updateConnectionState('failed');
      throw ErrorHandler.handle(error, 'LiveKit connection');
    }
  }

  /**
   * Disconnect from LiveKit room
   */
  async disconnect(): Promise<void> {
    logger.info(LOG_CONFIG.TAGS.RTC, 'Disconnecting from LiveKit room');

    try {
      // Stop audio level monitoring
      this.stopAudioLevelMonitoring();

      // Disconnect room
      if (this.room) {
        await this.room.disconnect();
        this.room = null;
      }

      // Clear token
      tokenService.clearToken();

      // Update states
      this.updateConnectionState('disconnected');
      this.updateAudioState({ 
        isMuted: true, 
        isPublishing: false, 
        hasPermission: false, 
        audioLevel: 0 
      });

      logger.info(LOG_CONFIG.TAGS.RTC, 'Disconnected from LiveKit room');
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.RTC, 'Error during disconnect', { error });
      throw ErrorHandler.handle(error, 'LiveKit disconnect');
    }
  }

  /**
   * Enable microphone and start publishing audio
   */
  async enableMicrophone(): Promise<void> {
    logger.info(LOG_CONFIG.TAGS.AUDIO, 'Enabling microphone');

    try {
      if (!this.room) {
        throw new AppError('Not connected to room', 'NOT_CONNECTED');
      }

      // Request microphone permission and create track
      const audioTrack = await this.room.localParticipant.createAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });

      // Publish the track
      await this.room.localParticipant.publishTrack(audioTrack);

      // Update audio state
      this.updateAudioState({
        ...this.audioState,
        isMuted: false,
        isPublishing: true,
        hasPermission: true,
      });

      // Start audio level monitoring
      this.startAudioLevelMonitoring(audioTrack);

      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Microphone enabled successfully');
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to enable microphone', { error });
      
      if (error instanceof Error && error.name === 'NotAllowedError') {
        throw ErrorHandler.handlePermissionError(error, 'microphone access');
      }
      
      throw ErrorHandler.handle(error, 'microphone enable');
    }
  }

  /**
   * Disable microphone and stop publishing audio
   */
  async disableMicrophone(): Promise<void> {
    logger.info(LOG_CONFIG.TAGS.AUDIO, 'Disabling microphone');

    try {
      if (!this.room) {
        throw new AppError('Not connected to room', 'NOT_CONNECTED');
      }

      // Stop audio level monitoring
      this.stopAudioLevelMonitoring();

      // Unpublish audio tracks
      const audioTracks = Array.from(this.room.localParticipant.audioTracks.values());
      for (const trackPub of audioTracks) {
        if (trackPub.track) {
          trackPub.track.stop();
        }
        await this.room.localParticipant.unpublishTrack(trackPub.track!);
      }

      // Update audio state
      this.updateAudioState({
        ...this.audioState,
        isMuted: true,
        isPublishing: false,
        audioLevel: 0,
      });

      logger.info(LOG_CONFIG.TAGS.AUDIO, 'Microphone disabled successfully');
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to disable microphone', { error });
      throw ErrorHandler.handle(error, 'microphone disable');
    }
  }

  /**
   * Send chat message via DataChannel
   */
  async sendChatMessage(message: ChatMessage): Promise<void> {
    logger.debug(LOG_CONFIG.TAGS.CHAT, 'Sending chat message', { messageId: message.id });

    try {
      if (!this.room) {
        throw new AppError('Not connected to room', 'NOT_CONNECTED');
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(message));

      await this.room.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);
      
      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Chat message sent successfully', { messageId: message.id });
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.CHAT, 'Failed to send chat message', { error, messageId: message.id });
      throw ErrorHandler.handle(error, 'chat message send');
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get current audio state
   */
  getAudioState(): AudioState {
    return { ...this.audioState };
  }

  /**
   * Get room information
   */
  getRoomInfo() {
    if (!this.room) {
      return null;
    }

    return {
      name: this.room.name,
      sid: this.room.sid,
      participantCount: this.room.numParticipants,
      participants: Array.from(this.room.remoteParticipants.values()).map(p => ({
        sid: p.sid,
        identity: p.identity,
        name: p.name,
        isSpeaking: p.isSpeaking,
      })),
    };
  }

  /**
   * Setup room event listeners
   */
  private setupRoomEventListeners(): void {
    if (!this.room) return;

    // Connection state changes
    this.room.on(RoomEvent.Connected, () => {
      logger.info(LOG_CONFIG.TAGS.RTC, 'Room connected event');
      this.updateConnectionState('connected');
    });

    this.room.on(RoomEvent.Disconnected, (reason) => {
      logger.info(LOG_CONFIG.TAGS.RTC, 'Room disconnected event', { reason });
      this.updateConnectionState('disconnected');
    });

    this.room.on(RoomEvent.Reconnecting, () => {
      logger.info(LOG_CONFIG.TAGS.RTC, 'Room reconnecting event');
      this.updateConnectionState('reconnecting');
    });

    this.room.on(RoomEvent.Reconnected, () => {
      logger.info(LOG_CONFIG.TAGS.RTC, 'Room reconnected event');
      this.updateConnectionState('connected');
      this.reconnectAttempts = 0;
    });

    // Participant events
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      logger.info(LOG_CONFIG.TAGS.RTC, 'Participant connected', { 
        participantId: participant.sid,
        identity: participant.identity 
      });
      this.eventHandlers.onParticipantConnected?.(participant);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      logger.info(LOG_CONFIG.TAGS.RTC, 'Participant disconnected', { 
        participantId: participant.sid,
        identity: participant.identity 
      });
      this.eventHandlers.onParticipantDisconnected?.(participant);
    });

    // Track events
    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      logger.debug(LOG_CONFIG.TAGS.RTC, 'Track subscribed', { 
        trackSid: track.sid,
        kind: track.kind,
        participantId: participant.sid 
      });
      
      // Auto-play remote audio tracks
      if (track.kind === Track.Kind.Audio) {
        this.setupRemoteAudioTrack(track as any, participant);
      }
      
      this.eventHandlers.onTrackSubscribed?.(track, participant);
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      logger.debug(LOG_CONFIG.TAGS.RTC, 'Track unsubscribed', { 
        trackSid: track.sid,
        kind: track.kind,
        participantId: participant.sid 
      });
      this.eventHandlers.onTrackUnsubscribed?.(track, participant);
    });

    // Speaking detection events
    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      logger.debug(LOG_CONFIG.TAGS.RTC, 'Active speakers changed', { 
        speakerCount: speakers.length,
        speakers: speakers.map(p => ({ sid: p.sid, identity: p.identity }))
      });
      
      // Update speaking state for all participants
      this.room.remoteParticipants.forEach(participant => {
        const isSpeaking = speakers.some(speaker => speaker.sid === participant.sid);
        if (participant.isSpeaking !== isSpeaking) {
          logger.debug(LOG_CONFIG.TAGS.RTC, 'Participant speaking state changed', {
            participantId: participant.sid,
            isSpeaking
          });
        }
      });
    });

    // Track muted/unmuted events
    this.room.on(RoomEvent.TrackMuted, (publication, participant) => {
      logger.debug(LOG_CONFIG.TAGS.RTC, 'Track muted', {
        trackSid: publication.trackSid,
        kind: publication.kind,
        participantId: participant.sid
      });
    });

    this.room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
      logger.debug(LOG_CONFIG.TAGS.RTC, 'Track unmuted', {
        trackSid: publication.trackSid,
        kind: publication.kind,
        participantId: participant.sid
      });
    });

    // Data channel events
    this.room.on(RoomEvent.DataReceived, (payload, participant) => {
      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Data received', { 
        size: payload.length,
        participantId: participant?.sid 
      });
      this.eventHandlers.onDataReceived?.(payload, participant);
    });

    // Connection quality events
    this.room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      logger.debug(LOG_CONFIG.TAGS.RTC, 'Connection quality changed', { 
        quality,
        participantId: participant.sid 
      });
    });

    // Media device events
    this.room.on(RoomEvent.MediaDevicesChanged, () => {
      logger.info(LOG_CONFIG.TAGS.RTC, 'Media devices changed');
    });

    // Room metadata events
    this.room.on(RoomEvent.RoomMetadataChanged, (metadata) => {
      logger.debug(LOG_CONFIG.TAGS.RTC, 'Room metadata changed', { metadata });
    });

    // Participant metadata events
    this.room.on(RoomEvent.ParticipantMetadataChanged, (metadata, participant) => {
      logger.debug(LOG_CONFIG.TAGS.RTC, 'Participant metadata changed', {
        participantId: participant.sid,
        metadata
      });
    });
  }

  /**
   * Get room options configuration
   */
  private getRoomOptions(): RoomOptions {
    return {
      ...LIVEKIT_CONFIG.ROOM_OPTIONS,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    };
  }

  /**
   * Update connection state and notify handlers
   */
  private updateConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      logger.debug(LOG_CONFIG.TAGS.RTC, 'Connection state changed', { 
        from: this.connectionState, 
        to: state 
      });
      this.connectionState = state;
      this.eventHandlers.onConnectionStateChanged?.(state);
    }
  }

  /**
   * Update audio state and notify handlers
   */
  private updateAudioState(newState: Partial<AudioState>): void {
    const oldState = { ...this.audioState };
    this.audioState = { ...this.audioState, ...newState };
    
    // Only notify if state actually changed
    if (JSON.stringify(oldState) !== JSON.stringify(this.audioState)) {
      this.eventHandlers.onAudioStateChanged?.(this.audioState);
    }
  }

  /**
   * Start monitoring audio levels
   */
  private startAudioLevelMonitoring(audioTrack: LocalAudioTrack): void {
    this.stopAudioLevelMonitoring();

    this.audioLevelTimer = setInterval(() => {
      if (audioTrack && !audioTrack.isMuted) {
        // Note: LiveKit doesn't provide direct audio level access
        // This is a placeholder for audio level monitoring
        // In a real implementation, you might use Web Audio API
        this.updateAudioState({
          ...this.audioState,
          audioLevel: Math.random() * 0.1, // Placeholder
        });
      }
    }, 100);
  }

  /**
   * Stop monitoring audio levels
   */
  private stopAudioLevelMonitoring(): void {
    if (this.audioLevelTimer) {
      clearInterval(this.audioLevelTimer);
      this.audioLevelTimer = null;
    }
  }

  /**
   * Setup remote audio track for playback
   */
  private setupRemoteAudioTrack(track: RemoteTrack, participant: Participant): void {
    try {
      logger.debug(LOG_CONFIG.TAGS.AUDIO, 'Setting up remote audio track', {
        trackSid: track.sid,
        participantId: participant.sid
      });

      // Attach track to audio element for playback
      const audioElement = track.attach();
      if (audioElement instanceof HTMLAudioElement) {
        audioElement.autoplay = true;
        audioElement.playsInline = true;
        
        // Set volume and audio properties
        audioElement.volume = 1.0;
        
        // Add to DOM (hidden)
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);
        
        // Store reference for cleanup
        track.on('ended', () => {
          if (audioElement.parentNode) {
            audioElement.parentNode.removeChild(audioElement);
          }
        });
        
        logger.debug(LOG_CONFIG.TAGS.AUDIO, 'Remote audio track attached and playing', {
          trackSid: track.sid,
          participantId: participant.sid
        });
      }
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.AUDIO, 'Failed to setup remote audio track', {
        error,
        trackSid: track.sid,
        participantId: participant.sid
      });
    }
  }

  /**
   * Get speaking participants
   */
  getSpeakingParticipants(): Participant[] {
    if (!this.room) return [];
    
    return Array.from(this.room.remoteParticipants.values())
      .filter(participant => participant.isSpeaking);
  }

  /**
   * Check if local participant is speaking
   */
  isLocalSpeaking(): boolean {
    return this.room?.localParticipant.isSpeaking ?? false;
  }
}

// Export singleton instance
export const livekitService = LiveKitService.getInstance();
