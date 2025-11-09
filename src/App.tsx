import { useState } from 'react';
import { Mic, MicOff, MessageCircle, Users } from 'lucide-react';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            LiveKit Voice Chat
          </h1>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Participants & Controls */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Participants Section */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2 mb-3">
              <Users className="w-4 h-4 text-gray-600" />
              <h2 className="font-medium text-gray-900">Participants</h2>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">You</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">You</p>
                  <p className="text-xs text-gray-500">Local participant</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'}`} />
              </div>
            </div>
          </div>

          {/* Audio Controls */}
          <div className="p-4">
            <h3 className="font-medium text-gray-900 mb-3">Audio Controls</h3>
            <div className="space-y-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isMuted
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {isMuted ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Unmute</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Mute</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => setIsConnected(!isConnected)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  isConnected
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isConnected ? 'Leave Room' : 'Join Room'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-4 h-4 text-gray-600" />
              <h2 className="font-medium text-gray-900">Chat</h2>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="text-center text-gray-500 text-sm">
                {isConnected ? 'Chat is ready' : 'Connect to start chatting'}
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder={isConnected ? "Type a message..." : "Connect to chat"}
                disabled={!isConnected}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                disabled={!isConnected}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App
