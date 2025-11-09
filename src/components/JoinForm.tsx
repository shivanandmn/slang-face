import React, { useState } from 'react';
import { User, Mic, MicOff, Loader2 } from 'lucide-react';
import { useRoomConnection, useRoomError } from '../contexts/RoomContext';

export const JoinForm: React.FC = () => {
  const [userName, setUserName] = useState('');
  const { isConnecting, joinRoom } = useRoomConnection();
  const { lastError, clearError } = useRoomError();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isConnecting) return;

    try {
      clearError();
      await joinRoom(userName.trim() || undefined);
    } catch (err) {
      console.error('[ui] Join failed:', err);
    }
  };

  const hasError = !!lastError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mic className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Join Voice Chat
          </h1>
          <p className="text-gray-600">
            Connect with others in real-time voice and text conversation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="userName" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your Name (Optional)
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="userName"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                maxLength={50}
                disabled={isConnecting}
                aria-describedby={hasError ? "error-message" : undefined}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to join anonymously
            </p>
          </div>

          {hasError && (
            <div 
              id="error-message"
              className="bg-red-50 border border-red-200 rounded-lg p-4"
              role="alert"
              aria-live="polite"
            >
              <div className="flex items-start">
                <MicOff className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800 mb-1">
                    Connection Failed
                  </h3>
                  <p className="text-sm text-red-700">
                    {lastError}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
            aria-describedby="join-button-description"
          >
            {isConnecting ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Connecting...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Mic className="w-5 h-5 mr-2" />
                Join Room
              </div>
            )}
          </button>
          <p 
            id="join-button-description" 
            className="text-xs text-gray-500 text-center"
          >
            You'll be asked for microphone permission
          </p>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">
              Connection Status: 
              <span className={`ml-1 font-medium ${
                isConnecting ? 'text-yellow-600' : 'text-gray-600'
              }`}>
                {isConnecting ? 'Connecting' : 'Ready'}
              </span>
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
              <span>🔒 Secure Connection</span>
              <span>🎤 Voice Enabled</span>
              <span>💬 Chat Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
