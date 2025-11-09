/**
 * Participants list component with speaking indicators and audio visualization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { livekitService } from '../services/livekitService';
import { logger } from '../utils/logger';
import { LOG_CONFIG } from '../config/constants';
import { EmptyParticipants, ParticipantSkeleton } from './LoadingStates';
import type { Participant } from 'livekit-client';

export type UIParticipant = {
  id: string;
  identity: string;
  name?: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocal: boolean;
  audioLevel: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'unknown';
};

export type ParticipantsListProps = {
  className?: string;
  showAudioLevels?: boolean;
  maxParticipants?: number;
};

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  className = '',
  showAudioLevels = true,
  maxParticipants = 10,
}) => {
  const [participants, setParticipants] = useState<UIParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<UIParticipant | null>(null);

  // Convert LiveKit participant to UI participant
  const convertParticipant = useCallback((participant: Participant, isLocal = false): UIParticipant => {
    return {
      id: participant.sid,
      identity: participant.identity,
      name: participant.name || participant.identity,
      isSpeaking: participant.isSpeaking,
      isMuted: participant.audioTracks.size === 0 || 
               Array.from(participant.audioTracks.values()).some(track => track.isMuted),
      isLocal,
      audioLevel: 0, // Will be updated by audio level monitoring
      connectionQuality: 'unknown',
    };
  }, []);

  // Handle participant connected
  const handleParticipantConnected = useCallback((participant: Participant) => {
    logger.info(LOG_CONFIG.TAGS.UI, 'Participant connected to list', { 
      participantId: participant.sid,
      identity: participant.identity 
    });

    const uiParticipant = convertParticipant(participant);
    setParticipants(prev => {
      // Check if participant already exists
      const exists = prev.some(p => p.id === uiParticipant.id);
      if (exists) {
        return prev.map(p => p.id === uiParticipant.id ? uiParticipant : p);
      }
      return [...prev, uiParticipant].slice(0, maxParticipants);
    });
  }, [convertParticipant, maxParticipants]);

  // Handle participant disconnected
  const handleParticipantDisconnected = useCallback((participant: Participant) => {
    logger.info(LOG_CONFIG.TAGS.UI, 'Participant disconnected from list', { 
      participantId: participant.sid,
      identity: participant.identity 
    });

    setParticipants(prev => prev.filter(p => p.id !== participant.sid));
  }, []);

  // Update participants list from room info
  const updateParticipantsList = useCallback(() => {
    const roomInfo = livekitService.getRoomInfo();
    if (!roomInfo) {
      setParticipants([]);
      setLocalParticipant(null);
      return;
    }

    // Update remote participants
    const remoteParticipants = roomInfo.participants.map(p => ({
      id: p.sid,
      identity: p.identity,
      name: p.name || p.identity,
      isSpeaking: p.isSpeaking,
      isMuted: false, // Will be updated by track events
      isLocal: false,
      audioLevel: 0,
      connectionQuality: 'unknown' as const,
    }));

    setParticipants(remoteParticipants.slice(0, maxParticipants));

    // Create local participant representation
    const audioState = livekitService.getAudioState();
    setLocalParticipant({
      id: 'local',
      identity: 'local',
      name: 'You',
      isSpeaking: false, // Will be updated by audio service
      isMuted: audioState.isMuted,
      isLocal: true,
      audioLevel: audioState.audioLevel,
      connectionQuality: 'excellent',
    });
  }, [maxParticipants]);

  // Setup event handlers
  useEffect(() => {
    livekitService.setEventHandlers({
      onParticipantConnected: handleParticipantConnected,
      onParticipantDisconnected: handleParticipantDisconnected,
      onAudioStateChanged: (audioState) => {
        // Update local participant audio state
        setLocalParticipant(prev => prev ? {
          ...prev,
          isMuted: audioState.isMuted,
          audioLevel: audioState.audioLevel,
        } : null);
      },
    });

    // Initial load
    updateParticipantsList();

    // Periodic update to sync with room state
    const interval = setInterval(updateParticipantsList, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [handleParticipantConnected, handleParticipantDisconnected, updateParticipantsList]);

  // Render audio level meter
  const renderAudioLevel = (participant: UIParticipant) => {
    if (!showAudioLevels) return null;

    const levelPercentage = Math.min(participant.audioLevel * 100, 100);
    const meterColor = participant.isSpeaking ? 'bg-green-500' : 'bg-blue-500';

    return (
      <div className="flex items-center space-x-2">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-100 ${meterColor}`}
            style={{ width: `${levelPercentage}%` }}
          />
        </div>
        {participant.isSpeaking && (
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
    );
  };

  // Render connection quality indicator
  const renderConnectionQuality = (quality: UIParticipant['connectionQuality']) => {
    const colors = {
      excellent: 'bg-green-500',
      good: 'bg-yellow-500',
      poor: 'bg-red-500',
      unknown: 'bg-gray-300',
    };

    return (
      <div className={`w-2 h-2 rounded-full ${colors[quality]}`} title={`Connection: ${quality}`} />
    );
  };

  // Render single participant
  const renderParticipant = (participant: UIParticipant) => {
    const speakingStatus = participant.isSpeaking ? 'speaking' : 'not speaking';
    const muteStatus = participant.isMuted ? 'muted' : 'unmuted';
    const participantLabel = `${participant.name}${participant.isLocal ? ' (you)' : ''}, ${muteStatus}, ${speakingStatus}`;

    return (
      <div
        key={participant.id}
        className={`
          flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200
          ${participant.isSpeaking 
            ? 'border-green-300 bg-green-50 shadow-md' 
            : 'border-gray-200 bg-white hover:bg-gray-50'
          }
          ${participant.isLocal ? 'ring-2 ring-blue-200' : ''}
        `}
        role="listitem"
        aria-label={participantLabel}
      >
        {/* Avatar */}
        <div className={`
          flex items-center justify-center w-10 h-10 rounded-full
          ${participant.isLocal ? 'bg-blue-100' : 'bg-gray-100'}
        `}>
          <User className={`w-5 h-5 ${participant.isLocal ? 'text-blue-600' : 'text-gray-600'}`} />
        </div>

        {/* Participant Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className={`
              text-sm font-medium truncate
              ${participant.isLocal ? 'text-blue-900' : 'text-gray-900'}
            `}>
              {participant.name}
            </span>
            {participant.isLocal && (
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                You
              </span>
            )}
          </div>
          
          {/* Audio Level Meter */}
          {renderAudioLevel(participant)}
        </div>

        {/* Audio Status */}
        <div className="flex items-center space-x-2">
          {/* Mute Status */}
          <div 
            className={`
              p-1.5 rounded-full
              ${participant.isMuted ? 'bg-red-100' : 'bg-green-100'}
            `}
            title={participant.isMuted ? 'Microphone muted' : 'Microphone active'}
            aria-label={participant.isMuted ? 'Muted' : 'Unmuted'}
          >
            {participant.isMuted ? (
              <MicOff className="w-3 h-3 text-red-600" aria-hidden="true" />
            ) : (
              <Mic className="w-3 h-3 text-green-600" aria-hidden="true" />
            )}
          </div>

          {/* Connection Quality */}
          {renderConnectionQuality(participant.connectionQuality)}
        </div>
      </div>
    );
  };

  const allParticipants = localParticipant ? [localParticipant, ...participants] : participants;

  return (
    <div className={`space-y-2 ${className}`} role="region" aria-label="Participants list">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900" id="participants-heading">
          Participants ({allParticipants.length})
        </h3>
        {participants.some(p => p.isSpeaking) && (
          <div className="flex items-center space-x-1 text-green-600" aria-live="polite">
            <Volume2 className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm font-medium">Someone is speaking</span>
          </div>
        )}
      </div>

      {allParticipants.length === 0 ? (
        <EmptyParticipants />
      ) : (
        <div 
          className="space-y-2" 
          role="list" 
          aria-labelledby="participants-heading"
        >
          {allParticipants.map(renderParticipant)}
        </div>
      )}

      {participants.length >= maxParticipants && (
        <div className="text-center py-2" role="status" aria-live="polite">
          <span className="text-xs text-gray-500">
            Showing {maxParticipants} participants (limit reached)
          </span>
        </div>
      )}
    </div>
  );
};
