import React, { useState } from 'react';
import { LogOut, Users, MessageCircle, Settings, Wifi, WifiOff } from 'lucide-react';
import { useRoomConnection, useRoomError, useRoomChat } from '../contexts/RoomContext';
import { AudioControls } from './AudioControls';
import { ParticipantsList } from './ParticipantsList';
import { ChatPanel } from './ChatPanel';

export const RoomView: React.FC = () => {
  const { isConnected, isConnecting, leaveRoom } = useRoomConnection();
  const { lastError } = useRoomError();
  const { unreadCount } = useRoomChat();
  const [activePanel, setActivePanel] = useState<'participants' | 'chat'>('participants');
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLeaveRoom = async () => {
    if (isLeaving) return;
    
    setIsLeaving(true);
    try {
      await leaveRoom();
    } catch (err) {
      console.error('[ui] Leave room failed:', err);
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' :
              isConnecting ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`} />
            <h1 className="text-lg font-semibold text-gray-900">
              Voice Chat Room
            </h1>
          </div>
          
          <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>Connected</span>
              </>
            ) : isConnecting ? (
              <>
                <Wifi className="w-4 h-4 animate-pulse" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Disconnected</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Mobile panel toggle */}
          <div className="flex sm:hidden">
            <button
              onClick={() => setActivePanel('participants')}
              className={`p-2 rounded-l-lg border ${
                activePanel === 'participants' 
                  ? 'bg-blue-50 border-blue-200 text-blue-600' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              aria-label="Show participants"
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActivePanel('chat')}
              className={`p-2 rounded-r-lg border-t border-r border-b ${
                activePanel === 'chat' 
                  ? 'bg-blue-50 border-blue-200 text-blue-600' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
              aria-label="Show chat"
            >
              <div className="relative">
                <MessageCircle className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </button>
          </div>

          <button
            onClick={handleLeaveRoom}
            disabled={isLeaving}
            className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Leave room"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isLeaving ? 'Leaving...' : 'Leave'}
            </span>
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {lastError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3" role="alert">
          <div className="flex items-center">
            <WifiOff className="w-5 h-5 text-red-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-red-800">Connection Issue</p>
              <p className="text-sm text-red-700">{lastError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop: Side Panel (Participants + Audio Controls) */}
        <div className={`${
          activePanel === 'participants' ? 'block' : 'hidden'
        } sm:block w-full sm:w-80 bg-white border-r border-gray-200 flex flex-col`}>
          
          {/* Audio Controls */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Audio Controls</h2>
            <AudioControls />
          </div>

          {/* Participants List */}
          <div className="flex-1 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-900">Participants</h2>
              <Users className="w-4 h-4 text-gray-500" />
            </div>
            <div className="h-full overflow-y-auto">
              <ParticipantsList />
            </div>
          </div>
        </div>

        {/* Desktop: Chat Panel / Mobile: Chat Panel when active */}
        <div className={`${
          activePanel === 'chat' ? 'block' : 'hidden'
        } sm:block flex-1 bg-white flex flex-col`}>
          <div className="p-4 border-b border-gray-200 sm:hidden">
            <h2 className="text-sm font-medium text-gray-900 flex items-center">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </h2>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <ChatPanel />
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLeaving && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Leaving room...</p>
          </div>
        </div>
      )}
    </div>
  );
};
