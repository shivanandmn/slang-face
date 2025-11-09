/**
 * Test component for Phase 4 implementation with enhanced chat system
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useAudio } from '../hooks/useAudio';
import { AudioControls } from './AudioControls';
import { ParticipantsList } from './ParticipantsList';
import { ChatPanel } from './ChatPanel';
import { logger } from '../utils/logger';
import { LOG_CONFIG } from '../config/constants';

export const ConnectionTest: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [audioInitialized, setAudioInitialized] = useState(false);

  const {
    session,
    isConnected,
    isConnecting,
    connectionState,
    audioState: authAudioState,
    startSession,
    endSession,
    enableMicrophone,
    disableMicrophone,
    isLoading,
    error,
    roomInfo,
  } = useAuth({
    onSessionStateChanged: (session) => {
      logger.info(LOG_CONFIG.TAGS.UI, 'Session state changed in test component', { session });
    },
    onConnectionStateChanged: (state) => {
      logger.info(LOG_CONFIG.TAGS.UI, 'Connection state changed in test component', { state });
    },
    onError: (error) => {
      logger.error(LOG_CONFIG.TAGS.UI, 'Error in test component', { error });
    },
  });

  // Enhanced audio hook
  const {
    audioState,
    audioLevel,
    isSpeaking,
    availableDevices,
    currentDevice,
    isInitialized: audioServiceInitialized,
    error: audioError,
    initialize: initializeAudio,
    toggleMute,
    switchDevice,
    startPublishing,
    stopPublishing,
    cleanup: cleanupAudio,
  } = useAudio();

  const {
    messages,
    sendMessage,
    clearMessages,
    messageCount,
  } = useChat({
    onMessageReceived: (message) => {
      logger.info(LOG_CONFIG.TAGS.UI, 'Message received in test component', { message });
    },
    onMessageSent: (message) => {
      logger.info(LOG_CONFIG.TAGS.UI, 'Message sent in test component', { message });
    },
  });

  const handleStartSession = async () => {
    try {
      await startSession({
        userId: userId || undefined,
        userName: userName || undefined,
      });
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleEndSession = async () => {
    try {
      await endSession();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const handleToggleMicrophone = async () => {
    try {
      if (audioState.isPublishing) {
        await stopPublishing();
        await disableMicrophone();
      } else {
        await enableMicrophone();
        await startPublishing();
      }
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  };

  const handleAudioMuteToggle = async (muted: boolean) => {
    try {
      await toggleMute();
    } catch (error) {
      console.error('Failed to toggle mute:', error);
    }
  };

  const handleDeviceChange = async (deviceId: string) => {
    try {
      await switchDevice(deviceId);
    } catch (error) {
      console.error('Failed to change device:', error);
    }
  };


  // Initialize audio service
  useEffect(() => {
    const initAudio = async () => {
      if (!audioInitialized && !audioServiceInitialized) {
        try {
          await initializeAudio();
          setAudioInitialized(true);
          logger.info(LOG_CONFIG.TAGS.UI, 'Audio service initialized in test component');
        } catch (error) {
          logger.error(LOG_CONFIG.TAGS.UI, 'Failed to initialize audio service in test component', { error });
        }
      }
    };

    initAudio();
  }, [audioInitialized, audioServiceInitialized, initializeAudio]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioServiceInitialized) {
        cleanupAudio();
      }
    };
  }, [audioServiceInitialized, cleanupAudio]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          LiveKit Connection Test - Phase 4 (Advanced Chat System)
        </h1>
        
        {/* Connection Status */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">State:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                connectionState === 'connected' ? 'bg-green-100 text-green-800' :
                connectionState === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                connectionState === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {connectionState}
              </span>
            </div>
            <div>
              <span className="font-medium">Loading:</span>
              <span className="ml-2">{isLoading ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Session Info */}
        {session && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Session Info</h2>
            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
              <div><span className="font-medium">User ID:</span> {session.userId}</div>
              <div><span className="font-medium">User Name:</span> {session.userName}</div>
              <div><span className="font-medium">Room:</span> {session.roomName}</div>
              <div><span className="font-medium">Joined:</span> {new Date(session.joinedAt).toLocaleTimeString()}</div>
            </div>
          </div>
        )}

        {/* Enhanced Audio State */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Enhanced Audio State</h2>
          <div className="grid grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <span className="font-medium">Muted:</span>
              <span className="ml-2">{audioState.isMuted ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="font-medium">Publishing:</span>
              <span className="ml-2">{audioState.isPublishing ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="font-medium">Permission:</span>
              <span className="ml-2">{audioState.hasPermission ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="font-medium">Level:</span>
              <span className="ml-2">{audioLevel.toFixed(3)}</span>
            </div>
            <div>
              <span className="font-medium">Speaking:</span>
              <span className={`ml-2 ${isSpeaking ? 'text-green-600 font-bold' : ''}`}>
                {isSpeaking ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="font-medium">Devices:</span>
              <span className="ml-2">{availableDevices.length}</span>
            </div>
          </div>
          
          {/* Current Device Info */}
          {currentDevice && (
            <div className="bg-blue-50 p-3 rounded text-sm">
              <div><span className="font-medium">Current Device:</span> {currentDevice.label}</div>
              <div><span className="font-medium">Device ID:</span> {currentDevice.deviceId.slice(0, 20)}...</div>
            </div>
          )}
          
          {/* Audio Error */}
          {audioError && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
              <span className="text-red-800 font-medium">Audio Error: </span>
              <span className="text-red-700 text-sm">{audioError}</span>
            </div>
          )}
        </div>

        {/* Room Info */}
        {roomInfo && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Room Info</h2>
            <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
              <div><span className="font-medium">Name:</span> {roomInfo.name}</div>
              <div><span className="font-medium">SID:</span> {roomInfo.sid}</div>
              <div><span className="font-medium">Participants:</span> {roomInfo.participantCount}</div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 text-sm mt-1">{error.userMessage}</p>
              <p className="text-red-600 text-xs mt-1">Code: {error.code}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-4">
          {!session ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="User ID (optional)"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="User Name (optional)"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleStartSession}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Starting Session...' : 'Start Session'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Enhanced Audio Controls */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-md font-medium mb-3">Audio Controls</h3>
                <AudioControls
                  audioState={audioState}
                  onMuteToggle={handleAudioMuteToggle}
                  onDeviceChange={handleDeviceChange}
                  disabled={isLoading || !isConnected}
                  className="mb-3"
                />
              </div>
              
              {/* Legacy Controls */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleToggleMicrophone}
                  disabled={isLoading || !isConnected}
                  className={`py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed ${
                    audioState.isPublishing
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {audioState.isPublishing ? 'Stop Publishing' : 'Start Publishing'}
                </button>
                <button
                  onClick={handleEndSession}
                  disabled={isLoading}
                  className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Ending...' : 'End Session'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Participants Section */}
      {session && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <ParticipantsList 
            className=""
            showAudioLevels={true}
            maxParticipants={5}
          />
        </div>
      )}

      {/* Audio Service Status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Audio Service Status</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Service Initialized:</span>
            <span className={`ml-2 ${audioServiceInitialized ? 'text-green-600' : 'text-red-600'}`}>
              {audioServiceInitialized ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium">Available Devices:</span>
            <span className="ml-2">{availableDevices.length}</span>
          </div>
        </div>
        
        {availableDevices.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Available Audio Devices:</h3>
            <div className="space-y-1 text-sm">
              {availableDevices.map((device, index) => (
                <div key={device.deviceId} className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">{index + 1}.</span> {device.label}
                  {currentDevice?.deviceId === device.deviceId && (
                    <span className="ml-2 text-green-600 font-medium">(Current)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Chat Section with ChatPanel */}
      {session && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Enhanced Chat System</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Messages: {messageCount}</span>
              <button
                onClick={clearMessages}
                className="text-gray-600 hover:text-gray-800 underline"
              >
                Clear
              </button>
            </div>
          </div>

          <ChatPanel
            currentUserId={session.userId}
            currentUserName={session.userName}
            onMessageSent={(message) => {
              logger.info(LOG_CONFIG.TAGS.UI, 'Message sent via ChatPanel', { messageId: message.id });
            }}
            onMessageReceived={(message) => {
              logger.info(LOG_CONFIG.TAGS.UI, 'Message received via ChatPanel', { messageId: message.id });
            }}
            showTypingIndicators={true}
            showMessageStatus={true}
            maxHeight="300px"
            placeholder="Type your message..."
            className="border border-gray-200 rounded-lg"
          />
        </div>
      )}
    </div>
  );
};
