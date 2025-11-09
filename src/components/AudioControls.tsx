/**
 * Audio controls component with mute/unmute, level meter, and device selection
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Settings, Volume2, VolumeX } from 'lucide-react';
import { audioService, type AudioDeviceInfo, type AudioLevelData } from '../services/audioService';
import { logger } from '../utils/logger';
import { LOG_CONFIG } from '../config/constants';
import type { AudioState } from '../types/api';

export type AudioControlsProps = {
  audioState: AudioState;
  onMuteToggle: (muted: boolean) => void;
  onDeviceChange?: (deviceId: string) => void;
  className?: string;
  showDeviceSelector?: boolean;
  showLevelMeter?: boolean;
  disabled?: boolean;
};

export const AudioControls: React.FC<AudioControlsProps> = ({
  audioState,
  onMuteToggle,
  onDeviceChange,
  className = '',
  showDeviceSelector = true,
  showLevelMeter = true,
  disabled = false,
}) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<AudioDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [permissionError, setPermissionError] = useState<string>('');

  // Handle audio level updates
  const handleAudioLevelChange = useCallback((data: AudioLevelData) => {
    setAudioLevel(data.level);
    setIsSpeaking(data.isSpeaking);
  }, []);

  // Handle device changes
  const handleDeviceChanged = useCallback((device: AudioDeviceInfo) => {
    setSelectedDevice(device.deviceId);
    logger.debug(LOG_CONFIG.TAGS.UI, 'Audio device changed', { deviceId: device.deviceId });
  }, []);

  // Handle permission changes
  const handlePermissionChanged = useCallback((hasPermission: boolean) => {
    if (!hasPermission) {
      setPermissionError('Microphone permission denied. Please allow access and try again.');
    } else {
      setPermissionError('');
    }
  }, []);

  // Handle errors
  const handleError = useCallback((error: Error) => {
    logger.error(LOG_CONFIG.TAGS.UI, 'Audio controls error', { error });
    setPermissionError(error.message);
  }, []);

  // Initialize audio service event handlers
  useEffect(() => {
    audioService.setEventHandlers({
      onAudioLevelChanged: handleAudioLevelChange,
      onDeviceChanged: handleDeviceChanged,
      onPermissionChanged: handlePermissionChanged,
      onError: handleError,
    });

    // Load available devices
    const loadDevices = async () => {
      try {
        const devices = await audioService.getAvailableDevices();
        setAvailableDevices(devices);
        
        // Set default device if none selected
        if (devices.length > 0 && !selectedDevice) {
          setSelectedDevice(devices[0].deviceId);
        }
      } catch (error) {
        logger.error(LOG_CONFIG.TAGS.UI, 'Failed to load audio devices', { error });
      }
    };

    loadDevices();
  }, [handleAudioLevelChange, handleDeviceChanged, handlePermissionChanged, handleError, selectedDevice]);

  // Handle mute toggle
  const handleMuteToggle = useCallback(async () => {
    if (disabled) return;

    try {
      const newMutedState = !audioState.isMuted;
      await onMuteToggle(newMutedState);
      
      logger.debug(LOG_CONFIG.TAGS.UI, 'Mute toggled', { muted: newMutedState });
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.UI, 'Failed to toggle mute', { error });
    }
  }, [audioState.isMuted, onMuteToggle, disabled]);

  // Handle device selection
  const handleDeviceSelect = useCallback(async (deviceId: string) => {
    if (disabled) return;

    try {
      setShowDeviceMenu(false);
      setSelectedDevice(deviceId);
      
      if (onDeviceChange) {
        await onDeviceChange(deviceId);
      }
      
      logger.debug(LOG_CONFIG.TAGS.UI, 'Audio device selected', { deviceId });
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.UI, 'Failed to change audio device', { error });
    }
  }, [onDeviceChange, disabled]);

  // Audio level visualization
  const renderLevelMeter = () => {
    if (!showLevelMeter) return null;

    const levelPercentage = Math.min(audioLevel * 100, 100);
    const meterColor = isSpeaking ? 'bg-green-500' : 'bg-blue-500';

    return (
      <div className="flex items-center space-x-2">
        <Volume2 className="w-4 h-4 text-gray-500" />
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-75 ${meterColor}`}
            style={{ width: `${levelPercentage}%` }}
          />
        </div>
        {isSpeaking && (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
    );
  };

  // Device selector dropdown
  const renderDeviceSelector = () => {
    if (!showDeviceSelector || availableDevices.length <= 1) return null;

    return (
      <div className="relative">
        <button
          onClick={() => setShowDeviceMenu(!showDeviceMenu)}
          disabled={disabled}
          className={`
            p-2 rounded-lg border transition-colors
            ${disabled 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
            }
          `}
          title="Select audio device"
        >
          <Settings className="w-4 h-4" />
        </button>

        {showDeviceMenu && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
            <div className="p-2 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">Audio Device</span>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {availableDevices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => handleDeviceSelect(device.deviceId)}
                  className={`
                    w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors
                    ${selectedDevice === device.deviceId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                  `}
                >
                  <div className="truncate">{device.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Permission status indicator
  const renderPermissionStatus = () => {
    if (!audioState.hasPermission && permissionError) {
      return (
        <div className="flex items-center space-x-2 text-red-600">
          <VolumeX className="w-4 h-4" />
          <span className="text-sm">{permissionError}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Mute/Unmute Button */}
      <button
        onClick={handleMuteToggle}
        disabled={disabled || !audioState.hasPermission}
        className={`
          flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200
          ${audioState.isMuted
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
          }
          ${disabled || !audioState.hasPermission
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:scale-105 active:scale-95'
          }
        `}
        title={audioState.isMuted ? 'Unmute microphone' : 'Mute microphone'}
      >
        {audioState.isMuted ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {/* Audio Level Meter */}
      {renderLevelMeter()}

      {/* Device Selector */}
      {renderDeviceSelector()}

      {/* Connection Status */}
      <div className="flex items-center space-x-2">
        <div className={`
          w-3 h-3 rounded-full
          ${audioState.isPublishing ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}
        `} />
        <span className="text-sm text-gray-600">
          {audioState.isPublishing ? 'Live' : 'Offline'}
        </span>
      </div>

      {/* Permission Error */}
      {renderPermissionStatus()}

      {/* Click outside to close device menu */}
      {showDeviceMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowDeviceMenu(false)}
        />
      )}
    </div>
  );
};
