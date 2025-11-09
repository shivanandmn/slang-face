import { useState, useEffect, useCallback, useRef } from 'react';
import { Room, RoomEvent, ConnectionState, ParticipantEvent, TrackEvent } from 'livekit-client';
import { authService } from '../services/authService';
import { audioService } from '../services/audioService';
import { chatService } from '../services/chatService';
import { logger } from '../utils/logger';
import type { UIParticipant } from '../types/participant';
import type { ChatMessage } from '../types/chat';

export interface RoomState {
  // Connection state
  isConnecting: boolean;
  isConnected: boolean;
  connectionState: ConnectionState;
  connectionError: string | null;
  
  // Room data
  room: Room | null;
  roomName: string | null;
  
  // Participants
  participants: UIParticipant[];
  localParticipant: UIParticipant | null;
  
  // Audio state
  isAudioEnabled: boolean;
  audioLevel: number;
  isSpeaking: boolean;
  audioDevices: MediaDeviceInfo[];
  selectedAudioDevice: string | null;
  
  // Chat state
  messages: ChatMessage[];
  typingUsers: string[];
  unreadCount: number;
  
  // UI state
  isJoined: boolean;
  lastError: string | null;
}

export interface RoomActions {
  // Connection actions
  joinRoom: (userName?: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  reconnect: () => Promise<void>;
  
  // Audio actions
  toggleAudio: () => Promise<void>;
  setAudioDevice: (deviceId: string) => Promise<void>;
  
  // Chat actions
  sendMessage: (text: string) => Promise<void>;
  markMessagesRead: () => void;
  
  // Utility actions
  clearError: () => void;
}

const initialState: RoomState = {
  isConnecting: false,
  isConnected: false,
  connectionState: ConnectionState.Disconnected,
  connectionError: null,
  room: null,
  roomName: null,
  participants: [],
  localParticipant: null,
  isAudioEnabled: false,
  audioLevel: 0,
  isSpeaking: false,
  audioDevices: [],
  selectedAudioDevice: null,
  messages: [],
  typingUsers: [],
  unreadCount: 0,
  isJoined: false,
  lastError: null,
};

export function useRoom(): RoomState & RoomActions {
  const [state, setState] = useState<RoomState>(initialState);
  const cleanupRef = useRef<(() => void)[]>([]);
  
  // Helper to update state
  const updateState = useCallback((updates: Partial<RoomState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Helper to add cleanup function
  const addCleanup = useCallback((cleanup: () => void) => {
    cleanupRef.current.push(cleanup);
  }, []);
  
  // Helper to run all cleanup functions
  const runCleanup = useCallback(() => {
    cleanupRef.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        logger.warn('[room]', 'Cleanup error:', error);
      }
    });
    cleanupRef.current = [];
  }, []);
  
  // Convert LiveKit participants to UI participants
  const convertParticipants = useCallback((room: Room): UIParticipant[] => {
    const participants: UIParticipant[] = [];
    
    // Add local participant
    const localP = room.localParticipant;
    if (localP) {
      participants.push({
        id: localP.sid || localP.identity,
        name: localP.name || localP.identity || 'You',
        isSpeaking: localP.isSpeaking,
        isMuted: localP.isMicrophoneEnabled === false,
        isLocal: true,
        connectionQuality: localP.connectionQuality,
        audioLevel: 0, // Will be updated by audio service
      });
    }
    
    // Add remote participants
    room.remoteParticipants.forEach(participant => {
      participants.push({
        id: participant.sid || participant.identity,
        name: participant.name || participant.identity || 'Unknown',
        isSpeaking: participant.isSpeaking,
        isMuted: !participant.hasAudio,
        isLocal: false,
        connectionQuality: participant.connectionQuality,
        audioLevel: 0, // Will be updated by track events
      });
    });
    
    return participants;
  }, []);
  
  // Event handlers
  const handleConnectionStateChange = useCallback((state: ConnectionState) => {
    logger.info('[room]', 'Connection state changed:', state);
    updateState({
      connectionState: state,
      isConnecting: state === ConnectionState.Connecting || state === ConnectionState.Reconnecting,
      isConnected: state === ConnectionState.Connected,
      connectionError: state === ConnectionState.Disconnected ? 'Connection lost' : null,
    });
  }, [updateState]);
  
  const handleParticipantConnected = useCallback((room: Room) => {
    logger.info('[room]', 'Participant connected, updating list');
    const participants = convertParticipants(room);
    const localParticipant = participants.find(p => p.isLocal) || null;
    updateState({ participants, localParticipant });
  }, [convertParticipants, updateState]);
  
  const handleParticipantDisconnected = useCallback((room: Room) => {
    logger.info('[room]', 'Participant disconnected, updating list');
    const participants = convertParticipants(room);
    const localParticipant = participants.find(p => p.isLocal) || null;
    updateState({ participants, localParticipant });
  }, [convertParticipants, updateState]);
  
  const handleSpeakingChanged = useCallback((room: Room) => {
    const participants = convertParticipants(room);
    const localParticipant = participants.find(p => p.isLocal) || null;
    updateState({ participants, localParticipant });
  }, [convertParticipants, updateState]);
  
  const handleTrackMuted = useCallback((room: Room) => {
    const participants = convertParticipants(room);
    const localParticipant = participants.find(p => p.isLocal) || null;
    updateState({ participants, localParticipant });
  }, [convertParticipants, updateState]);
  
  const handleChatMessage = useCallback((message: ChatMessage) => {
    updateState(prev => ({
      messages: [...prev.messages, message],
      unreadCount: prev.unreadCount + 1,
    }));
  }, [updateState]);
  
  const handleTypingUpdate = useCallback((typingUsers: string[]) => {
    updateState({ typingUsers });
  }, [updateState]);
  
  const handleAudioLevelUpdate = useCallback((level: number) => {
    updateState({ audioLevel: level });
  }, [updateState]);
  
  const handleSpeakingUpdate = useCallback((isSpeaking: boolean) => {
    updateState({ isSpeaking });
  }, [updateState]);
  
  const handleAudioDevicesUpdate = useCallback((devices: MediaDeviceInfo[]) => {
    updateState({ audioDevices: devices });
  }, [updateState]);
  
  const handleAudioStateUpdate = useCallback((isEnabled: boolean, deviceId?: string) => {
    updateState({
      isAudioEnabled: isEnabled,
      selectedAudioDevice: deviceId || null,
    });
  }, [updateState]);
  
  // Actions
  const joinRoom = useCallback(async (userName?: string) => {
    try {
      updateState({ isConnecting: true, lastError: null });
      
      // Start authentication and connection
      await authService.startSession(userName);
      
      // Get the room from LiveKit service
      const room = authService.getRoom();
      if (!room) {
        throw new Error('Failed to get room instance');
      }
      
      // Set up event listeners
      const handleConnStateChange = (state: ConnectionState) => handleConnectionStateChange(state);
      const handleParticipantConn = () => handleParticipantConnected(room);
      const handleParticipantDisc = () => handleParticipantDisconnected(room);
      const handleSpeaking = () => handleSpeakingChanged(room);
      const handleMuted = () => handleTrackMuted(room);
      
      room.on(RoomEvent.ConnectionStateChanged, handleConnStateChange);
      room.on(RoomEvent.ParticipantConnected, handleParticipantConn);
      room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisc);
      room.on(RoomEvent.ParticipantPermissionsChanged, handleParticipantConn);
      room.on(ParticipantEvent.IsSpeakingChanged, handleSpeaking);
      room.on(TrackEvent.Muted, handleMuted);
      room.on(TrackEvent.Unmuted, handleMuted);
      
      // Set up service event listeners
      authService.onChatMessage(handleChatMessage);
      authService.onTypingUpdate(handleTypingUpdate);
      audioService.onAudioLevel(handleAudioLevelUpdate);
      audioService.onSpeakingChanged(handleSpeakingUpdate);
      audioService.onDevicesChanged(handleAudioDevicesUpdate);
      audioService.onAudioStateChanged(handleAudioStateUpdate);
      
      // Store cleanup functions
      addCleanup(() => {
        room.off(RoomEvent.ConnectionStateChanged, handleConnStateChange);
        room.off(RoomEvent.ParticipantConnected, handleParticipantConn);
        room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisc);
        room.off(RoomEvent.ParticipantPermissionsChanged, handleParticipantConn);
        room.off(ParticipantEvent.IsSpeakingChanged, handleSpeaking);
        room.off(TrackEvent.Muted, handleMuted);
        room.off(TrackEvent.Unmuted, handleMuted);
      });
      
      // Initialize state
      const participants = convertParticipants(room);
      const localParticipant = participants.find(p => p.isLocal) || null;
      
      updateState({
        isConnecting: false,
        isConnected: true,
        isJoined: true,
        room,
        roomName: room.name,
        participants,
        localParticipant,
        connectionState: room.state,
      });
      
      logger.info('[room]', 'Successfully joined room:', room.name);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join room';
      logger.error('[room]', 'Join room failed:', error);
      updateState({
        isConnecting: false,
        isConnected: false,
        lastError: errorMessage,
      });
      throw error;
    }
  }, [
    updateState, addCleanup, convertParticipants,
    handleConnectionStateChange, handleParticipantConnected, handleParticipantDisconnected,
    handleSpeakingChanged, handleTrackMuted, handleChatMessage, handleTypingUpdate,
    handleAudioLevelUpdate, handleSpeakingUpdate, handleAudioDevicesUpdate, handleAudioStateUpdate
  ]);
  
  const leaveRoom = useCallback(async () => {
    try {
      logger.info('[room]', 'Leaving room');
      
      // Run all cleanup functions
      runCleanup();
      
      // End the session
      await authService.endSession();
      
      // Reset state
      setState(initialState);
      
      logger.info('[room]', 'Successfully left room');
      
    } catch (error) {
      logger.error('[room]', 'Leave room error:', error);
      // Still reset state even if cleanup failed
      setState(initialState);
    }
  }, [runCleanup]);
  
  const reconnect = useCallback(async () => {
    try {
      updateState({ isConnecting: true, lastError: null });
      
      const room = state.room;
      if (room) {
        await room.reconnect();
        logger.info('[room]', 'Reconnection successful');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Reconnection failed';
      logger.error('[room]', 'Reconnect failed:', error);
      updateState({
        isConnecting: false,
        lastError: errorMessage,
      });
    }
  }, [state.room, updateState]);
  
  const toggleAudio = useCallback(async () => {
    try {
      if (state.isAudioEnabled) {
        await audioService.disableAudio();
      } else {
        await audioService.enableAudio();
      }
    } catch (error) {
      logger.error('[room]', 'Toggle audio failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle audio';
      updateState({ lastError: errorMessage });
    }
  }, [state.isAudioEnabled, updateState]);
  
  const setAudioDevice = useCallback(async (deviceId: string) => {
    try {
      await audioService.setAudioDevice(deviceId);
    } catch (error) {
      logger.error('[room]', 'Set audio device failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to set audio device';
      updateState({ lastError: errorMessage });
    }
  }, [updateState]);
  
  const sendMessage = useCallback(async (text: string) => {
    try {
      await authService.sendChatMessage(text);
    } catch (error) {
      logger.error('[room]', 'Send message failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      updateState({ lastError: errorMessage });
      throw error;
    }
  }, [updateState]);
  
  const markMessagesRead = useCallback(() => {
    updateState({ unreadCount: 0 });
  }, [updateState]);
  
  const clearError = useCallback(() => {
    updateState({ lastError: null });
  }, [updateState]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      runCleanup();
    };
  }, [runCleanup]);
  
  return {
    ...state,
    joinRoom,
    leaveRoom,
    reconnect,
    toggleAudio,
    setAudioDevice,
    sendMessage,
    markMessagesRead,
    clearError,
  };
}
