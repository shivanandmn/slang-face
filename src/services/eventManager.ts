import { Room, RoomEvent, ParticipantEvent, TrackEvent, ConnectionState, DisconnectReason } from 'livekit-client';
import { logger } from '../utils/logger';

export interface EventCallbacks {
  // Connection events
  onConnectionStateChanged?: (state: ConnectionState) => void;
  onConnected?: () => void;
  onDisconnected?: (reason?: DisconnectReason) => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
  
  // Participant events
  onParticipantConnected?: (participantId: string) => void;
  onParticipantDisconnected?: (participantId: string) => void;
  onParticipantMetadataChanged?: (participantId: string, metadata: string) => void;
  onParticipantPermissionsChanged?: (participantId: string) => void;
  
  // Speaking events
  onSpeakingChanged?: (participantId: string, isSpeaking: boolean) => void;
  
  // Track events
  onTrackPublished?: (participantId: string, trackSid: string) => void;
  onTrackUnpublished?: (participantId: string, trackSid: string) => void;
  onTrackSubscribed?: (participantId: string, trackSid: string) => void;
  onTrackUnsubscribed?: (participantId: string, trackSid: string) => void;
  onTrackMuted?: (participantId: string, trackSid: string) => void;
  onTrackUnmuted?: (participantId: string, trackSid: string) => void;
  
  // Data events
  onDataReceived?: (data: Uint8Array, participantId: string) => void;
  
  // Error events
  onError?: (error: Error) => void;
}

export class EventManager {
  private room: Room | null = null;
  private callbacks: EventCallbacks = {};
  private eventListeners: Array<{ event: string; handler: (...args: any[]) => void }> = [];
  
  constructor() {
    logger.info('[events]', 'EventManager initialized');
  }
  
  /**
   * Set the room instance and attach event listeners
   */
  setRoom(room: Room) {
    if (this.room) {
      this.detachListeners();
    }
    
    this.room = room;
    this.attachListeners();
    logger.info('[events]', 'Room set and listeners attached');
  }
  
  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: EventCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    logger.debug('[events]', 'Callbacks updated');
  }
  
  /**
   * Clear specific callbacks
   */
  clearCallbacks(callbackNames?: (keyof EventCallbacks)[]) {
    if (callbackNames) {
      callbackNames.forEach(name => {
        delete this.callbacks[name];
      });
    } else {
      this.callbacks = {};
    }
    logger.debug('[events]', 'Callbacks cleared');
  }
  
  /**
   * Attach all event listeners to the room
   */
  private attachListeners() {
    if (!this.room) return;
    
    // Connection events
    this.addListener(RoomEvent.Connected, () => {
      logger.info('[events]', 'Room connected');
      this.callbacks.onConnected?.();
    });
    
    this.addListener(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
      logger.info('[events]', 'Room disconnected:', reason);
      this.callbacks.onDisconnected?.(reason);
    });
    
    this.addListener(RoomEvent.Reconnecting, () => {
      logger.info('[events]', 'Room reconnecting');
      this.callbacks.onReconnecting?.();
    });
    
    this.addListener(RoomEvent.Reconnected, () => {
      logger.info('[events]', 'Room reconnected');
      this.callbacks.onReconnected?.();
    });
    
    this.addListener(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      logger.info('[events]', 'Connection state changed:', state);
      this.callbacks.onConnectionStateChanged?.(state);
    });
    
    // Participant events
    this.addListener(RoomEvent.ParticipantConnected, (participant) => {
      logger.info('[events]', 'Participant connected:', participant.identity);
      this.callbacks.onParticipantConnected?.(participant.sid || participant.identity);
      
      // Attach participant-specific events
      this.attachParticipantListeners(participant);
    });
    
    this.addListener(RoomEvent.ParticipantDisconnected, (participant) => {
      logger.info('[events]', 'Participant disconnected:', participant.identity);
      this.callbacks.onParticipantDisconnected?.(participant.sid || participant.identity);
    });
    
    this.addListener(RoomEvent.ParticipantMetadataChanged, (metadata, participant) => {
      logger.debug('[events]', 'Participant metadata changed:', participant?.identity, metadata);
      if (participant) {
        this.callbacks.onParticipantMetadataChanged?.(participant.sid || participant.identity, metadata || '');
      }
    });
    
    this.addListener(RoomEvent.ParticipantPermissionsChanged, (prevPermissions, participant) => {
      logger.debug('[events]', 'Participant permissions changed:', participant?.identity);
      if (participant) {
        this.callbacks.onParticipantPermissionsChanged?.(participant.sid || participant.identity);
      }
    });
    
    // Track events
    this.addListener(RoomEvent.TrackPublished, (publication, participant) => {
      logger.debug('[events]', 'Track published:', publication.trackSid, participant.identity);
      this.callbacks.onTrackPublished?.(participant.sid || participant.identity, publication.trackSid);
    });
    
    this.addListener(RoomEvent.TrackUnpublished, (publication, participant) => {
      logger.debug('[events]', 'Track unpublished:', publication.trackSid, participant.identity);
      this.callbacks.onTrackUnpublished?.(participant.sid || participant.identity, publication.trackSid);
    });
    
    this.addListener(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      logger.debug('[events]', 'Track subscribed:', publication.trackSid, participant.identity);
      this.callbacks.onTrackSubscribed?.(participant.sid || participant.identity, publication.trackSid);
    });
    
    this.addListener(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      logger.debug('[events]', 'Track unsubscribed:', publication.trackSid, participant.identity);
      this.callbacks.onTrackUnsubscribed?.(participant.sid || participant.identity, publication.trackSid);
    });
    
    // Data events
    this.addListener(RoomEvent.DataReceived, (payload, participant) => {
      logger.debug('[events]', 'Data received from:', participant?.identity);
      if (participant) {
        this.callbacks.onDataReceived?.(payload, participant.sid || participant.identity);
      }
    });
    
    // Error events
    this.addListener(RoomEvent.RoomMetadataChanged, (metadata) => {
      logger.debug('[events]', 'Room metadata changed:', metadata);
    });
    
    // Also attach listeners for local participant
    if (this.room.localParticipant) {
      this.attachParticipantListeners(this.room.localParticipant);
    }
    
    // Attach listeners for existing remote participants
    this.room.remoteParticipants.forEach(participant => {
      this.attachParticipantListeners(participant);
    });
  }
  
  /**
   * Attach participant-specific event listeners
   */
  private attachParticipantListeners(participant: any) {
    // Speaking events
    const speakingHandler = (isSpeaking: boolean) => {
      logger.debug('[events]', 'Speaking changed:', participant.identity, isSpeaking);
      this.callbacks.onSpeakingChanged?.(participant.sid || participant.identity, isSpeaking);
    };
    
    participant.on(ParticipantEvent.IsSpeakingChanged, speakingHandler);
    this.eventListeners.push({
      event: `participant-${participant.sid}-speaking`,
      handler: () => participant.off(ParticipantEvent.IsSpeakingChanged, speakingHandler)
    });
    
    // Track mute events
    const trackMutedHandler = (publication: any) => {
      logger.debug('[events]', 'Track muted:', publication.trackSid, participant.identity);
      this.callbacks.onTrackMuted?.(participant.sid || participant.identity, publication.trackSid);
    };
    
    const trackUnmutedHandler = (publication: any) => {
      logger.debug('[events]', 'Track unmuted:', publication.trackSid, participant.identity);
      this.callbacks.onTrackUnmuted?.(participant.sid || participant.identity, publication.trackSid);
    };
    
    participant.on(ParticipantEvent.TrackMuted, trackMutedHandler);
    participant.on(ParticipantEvent.TrackUnmuted, trackUnmutedHandler);
    
    this.eventListeners.push({
      event: `participant-${participant.sid}-muted`,
      handler: () => {
        participant.off(ParticipantEvent.TrackMuted, trackMutedHandler);
        participant.off(ParticipantEvent.TrackUnmuted, trackUnmutedHandler);
      }
    });
    
    // Metadata changes
    const metadataHandler = (metadata: string) => {
      logger.debug('[events]', 'Participant metadata changed:', participant.identity, metadata);
      this.callbacks.onParticipantMetadataChanged?.(participant.sid || participant.identity, metadata);
    };
    
    participant.on(ParticipantEvent.MetadataChanged, metadataHandler);
    this.eventListeners.push({
      event: `participant-${participant.sid}-metadata`,
      handler: () => participant.off(ParticipantEvent.MetadataChanged, metadataHandler)
    });
  }
  
  /**
   * Add a room event listener and track it for cleanup
   */
  private addListener(event: string, handler: (...args: any[]) => void) {
    if (!this.room) return;
    
    this.room.on(event as any, handler);
    this.eventListeners.push({ event, handler });
  }
  
  /**
   * Detach all event listeners
   */
  private detachListeners() {
    if (!this.room) return;
    
    logger.debug('[events]', 'Detaching event listeners');
    
    this.eventListeners.forEach(({ event, handler }) => {
      try {
        if (event.startsWith('participant-')) {
          // These are cleanup functions for participant events
          handler();
        } else {
          // These are room events
          this.room?.off(event as any, handler);
        }
      } catch (error) {
        logger.warn('[events]', 'Error detaching listener:', event, error);
      }
    });
    
    this.eventListeners = [];
  }
  
  /**
   * Clean up all resources
   */
  cleanup() {
    logger.info('[events]', 'Cleaning up EventManager');
    this.detachListeners();
    this.callbacks = {};
    this.room = null;
  }
  
  /**
   * Get current room instance
   */
  getRoom(): Room | null {
    return this.room;
  }
  
  /**
   * Check if room is connected
   */
  isConnected(): boolean {
    return this.room?.state === ConnectionState.Connected;
  }
}

// Singleton instance
export const eventManager = new EventManager();
