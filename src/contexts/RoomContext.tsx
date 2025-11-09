import React, { createContext, useContext, ReactNode } from 'react';
import { useRoom, RoomState, RoomActions } from '../hooks/useRoom';

// Context type combining state and actions
type RoomContextType = RoomState & RoomActions;

// Create the context
const RoomContext = createContext<RoomContextType | null>(null);

// Provider component props
interface RoomProviderProps {
  children: ReactNode;
}

// Provider component
export function RoomProvider({ children }: RoomProviderProps) {
  const roomData = useRoom();
  
  return (
    <RoomContext.Provider value={roomData}>
      {children}
    </RoomContext.Provider>
  );
}

// Custom hook to use the room context
export function useRoomContext(): RoomContextType {
  const context = useContext(RoomContext);
  
  if (!context) {
    throw new Error('useRoomContext must be used within a RoomProvider');
  }
  
  return context;
}

// Convenience hooks for specific parts of the state
export function useRoomConnection() {
  const { 
    isConnecting, 
    isConnected, 
    connectionState, 
    connectionError,
    isJoined,
    joinRoom, 
    leaveRoom, 
    reconnect 
  } = useRoomContext();
  
  return {
    isConnecting,
    isConnected,
    connectionState,
    connectionError,
    isJoined,
    joinRoom,
    leaveRoom,
    reconnect,
  };
}

export function useRoomParticipants() {
  const { 
    participants, 
    localParticipant,
    room,
    roomName 
  } = useRoomContext();
  
  return {
    participants,
    localParticipant,
    room,
    roomName,
  };
}

export function useRoomAudio() {
  const {
    isAudioEnabled,
    audioLevel,
    isSpeaking,
    audioDevices,
    selectedAudioDevice,
    toggleAudio,
    setAudioDevice,
  } = useRoomContext();
  
  return {
    isAudioEnabled,
    audioLevel,
    isSpeaking,
    audioDevices,
    selectedAudioDevice,
    toggleAudio,
    setAudioDevice,
  };
}

export function useRoomChat() {
  const {
    messages,
    typingUsers,
    unreadCount,
    sendMessage,
    markMessagesRead,
  } = useRoomContext();
  
  return {
    messages,
    typingUsers,
    unreadCount,
    sendMessage,
    markMessagesRead,
  };
}

export function useRoomError() {
  const {
    lastError,
    clearError,
  } = useRoomContext();
  
  return {
    lastError,
    clearError,
  };
}
