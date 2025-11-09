/**
 * Optimized Audio Controls Component
 * Performance-enhanced audio controls with memoization and optimized rendering
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  memo,
  useRef
} from 'react';
import { Mic, MicOff, Settings, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import { audioService, type AudioDeviceInfo, type AudioLevelData } from '../services/audioService';
import { logger } from '../utils/logger';
import { LOG_CONFIG } from '../config/constants';
import type { AudioState } from '../types/api';
import { 
  useThrottle, 
  useDebounce, 
  usePerformanceMonitor,
  shallowEqual,
  PERFORMANCE_CONFIG
} from '../utils/performance';
import { getAnimationClasses, getTransitionClasses } from '../utils/animations';
import { useToast } from './Toast';

export type OptimizedAudioControlsProps = {
  audioState: AudioState;
  onMuteToggle: (muted: boolean) => void;
  onDeviceChange?: (deviceId: string) => void;
  className?: string;
  showDeviceSelector?: boolean;
  showLevelMeter?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'minimal';
};

// Memoized audio level meter component
const AudioLevelMeter = memo<{
  level: number;
  isSpeaking: boolean;
  size: 'sm' | 'md' | 'lg';
}>(({ level, isSpeaking, size }) => {
  const meterHeight = useMemo(() => {
    switch (size) {
      case 'sm': return 'h-2';
      case 'md': return 'h-3';
      case 'lg': return 'h-4';
      default: return 'h-3';
    }
  }, [size]);
  
  const meterWidth = useMemo(() => {
    switch (size) {
      case 'sm': return 'w-16';
      case 'md': return 'w-20';
      case 'lg': return 'w-24';
      default: return 'w-20';
    }
  }, [size]);
  
  const levelPercentage = Math.min(level * 100, 100);
  
  return (
    <div className={`
      ${meterWidth} ${meterHeight} bg-gray-200 rounded-full overflow-hidden
      ${getTransitionClasses.all('fast')}
    `}>
      <div
        className={`
          h-full rounded-full transition-all duration-100 ease-out
          ${isSpeaking 
            ? 'bg-gradient-to-r from-success-400 to-success-500' 
            : 'bg-gradient-to-r from-gray-300 to-gray-400'
          }
        `}
        style={{ width: `${levelPercentage}%` }}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.level === nextProps.level &&
    prevProps.isSpeaking === nextProps.isSpeaking &&
    prevProps.size === nextProps.size
  );
});

AudioLevelMeter.displayName = 'AudioLevelMeter';

// Memoized device selector component
const DeviceSelector = memo<{
  devices: AudioDeviceInfo[];
  selectedDevice: string;
  onDeviceChange: (deviceId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  size: 'sm' | 'md' | 'lg';
}>(({ devices, selectedDevice, onDeviceChange, isOpen, onToggle, size }) => {
  const buttonSize = useMemo(() => {
    switch (size) {
      case 'sm': return 'p-1';
      case 'md': return 'p-2';
      case 'lg': return 'p-3';
      default: return 'p-2';
    }
  }, [size]);
  
  const iconSize = useMemo(() => {
    switch (size) {
      case 'sm': return 'w-3 h-3';
      case 'md': return 'w-4 h-4';
      case 'lg': return 'w-5 h-5';
      default: return 'w-4 h-4';
    }
  }, [size]);
  
  const selectedDeviceName = useMemo(() => {
    const device = devices.find(d => d.deviceId === selectedDevice);
    return device?.label || 'Default';
  }, [devices, selectedDevice]);
  
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`
          ${buttonSize} flex items-center space-x-1 text-gray-600 rounded-md
          ${getTransitionClasses.colors('fast')}
          hover:text-gray-800 hover:bg-gray-100
          focus:outline-none focus:ring-2 focus:ring-primary-500
        `}
        title="Select audio device"
      >
        <Settings className={iconSize} />
        <ChevronDown className={`${iconSize} ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className={`
          absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg
          min-w-48 max-w-64 z-50
          ${getAnimationClasses.slideIn('fast')}
        `}>
          <div className="py-1">
            {devices.map((device) => (
              <button
                key={device.deviceId}
                onClick={() => {
                  onDeviceChange(device.deviceId);
                  onToggle();
                }}
                className={`
                  w-full px-3 py-2 text-left text-sm
                  ${getTransitionClasses.colors('fast')}
                  ${selectedDevice === device.deviceId 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <div className="truncate">{device.label}</div>
                {selectedDevice === device.deviceId && (
                  <div className="text-xs text-primary-500 mt-1">Currently selected</div>
                )}
              </button>
            ))}
            
            {devices.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">
                No audio devices available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}, shallowEqual);

DeviceSelector.displayName = 'DeviceSelector';

// Main optimized audio controls component
export const OptimizedAudioControls: React.FC<OptimizedAudioControlsProps> = memo(({
  audioState,
  onMuteToggle,
  onDeviceChange,
  className = '',
  showDeviceSelector = true,
  showLevelMeter = true,
  disabled = false,
  size = 'md',
  variant = 'default'
}) => {
  // Performance monitoring
  const { markRender } = usePerformanceMonitor('OptimizedAudioControls');
  
  // State management
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<AudioDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [permissionError, setPermissionError] = useState<string>('');
  
  // Refs for cleanup
  const cleanupRef = useRef<(() => void)[]>([]);
  
  // Toast notifications
  const { toast } = useToast();
  
  // Throttled audio level updates for better performance
  const throttledAudioLevelUpdate = useThrottle(
    (data: AudioLevelData) => {
      setAudioLevel(data.level);
      setIsSpeaking(data.isSpeaking);
    },
    PERFORMANCE_CONFIG.throttle.animation
  );
  
  // Debounced device change handler
  const debouncedDeviceChange = useDebounce(
    (deviceId: string) => {
      onDeviceChange?.(deviceId);
      toast.success('Audio device changed');
    },
    PERFORMANCE_CONFIG.debounce.input
  );
  
  // Memoized event handlers
  const handleAudioLevelChange = useCallback((data: AudioLevelData) => {
    throttledAudioLevelUpdate(data);
  }, [throttledAudioLevelUpdate]);
  
  const handleDeviceChanged = useCallback((device: AudioDeviceInfo) => {
    setSelectedDevice(device.deviceId);
    logger.debug(LOG_CONFIG.TAGS.UI, 'Audio device changed', { deviceId: device.deviceId });
  }, []);
  
  const handlePermissionChange = useCallback((hasPermission: boolean, error?: string) => {
    if (!hasPermission && error) {
      setPermissionError(error);
      toast.error('Microphone permission denied', error);
    } else {
      setPermissionError('');
    }
  }, [toast]);
  
  const handleMuteToggle = useCallback(() => {
    if (disabled) return;
    
    markRender('mute-toggle');
    const newMutedState = !audioState.enabled;
    onMuteToggle(newMutedState);
    
    // Show feedback
    toast.info(newMutedState ? 'Microphone muted' : 'Microphone unmuted');
  }, [disabled, audioState.enabled, onMuteToggle, toast, markRender]);
  
  const handleDeviceSelect = useCallback((deviceId: string) => {
    setSelectedDevice(deviceId);
    debouncedDeviceChange(deviceId);
  }, [debouncedDeviceChange]);
  
  const toggleDeviceMenu = useCallback(() => {
    setShowDeviceMenu(prev => !prev);
  }, []);
  
  // Initialize audio service and event listeners
  useEffect(() => {
    if (!audioService.isInitialized()) {
      logger.warn('[OptimizedAudioControls] AudioService not initialized');
      return;
    }
    
    // Set up event listeners
    const cleanup1 = audioService.onAudioLevel(handleAudioLevelChange);
    const cleanup2 = audioService.onDeviceChanged(handleDeviceChanged);
    const cleanup3 = audioService.onPermissionChange(handlePermissionChange);
    
    // Store cleanup functions
    cleanupRef.current = [cleanup1, cleanup2, cleanup3];
    
    // Load available devices
    audioService.getAvailableDevices()
      .then(devices => {
        setAvailableDevices(devices);
        const currentDevice = audioService.getCurrentDevice();
        if (currentDevice) {
          setSelectedDevice(currentDevice.deviceId);
        }
      })
      .catch(error => {
        logger.error('[OptimizedAudioControls] Failed to load devices', { error });
      });
    
    // Cleanup on unmount
    return () => {
      cleanupRef.current.forEach(cleanup => cleanup?.());
    };
  }, [handleAudioLevelChange, handleDeviceChanged, handlePermissionChange]);
  
  // Close device menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDeviceMenu) {
        setShowDeviceMenu(false);
      }
    };
    
    if (showDeviceMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDeviceMenu]);
  
  // Memoized component styling
  const containerClasses = useMemo(() => {
    const baseClasses = `
      flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200
      ${getTransitionClasses.all('normal')}
    `;
    
    const variantClasses = {
      default: 'shadow-sm',
      compact: 'p-2 space-x-2',
      minimal: 'bg-transparent border-none shadow-none p-1 space-x-1'
    };
    
    return `${baseClasses} ${variantClasses[variant]} ${className}`;
  }, [variant, className]);
  
  const muteButtonClasses = useMemo(() => {
    const sizeClasses = {
      sm: 'p-2',
      md: 'p-3',
      lg: 'p-4'
    };
    
    const stateClasses = audioState.enabled
      ? 'bg-primary-500 text-white hover:bg-primary-600'
      : 'bg-gray-500 text-white hover:bg-gray-600';
    
    return `
      ${sizeClasses[size]} rounded-full ${stateClasses}
      ${getTransitionClasses.all('fast')}
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
      disabled:opacity-50 disabled:cursor-not-allowed
      ${disabled ? '' : 'active:scale-95'}
    `;
  }, [size, audioState.enabled, disabled]);
  
  const iconSize = useMemo(() => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'md': return 'w-5 h-5';
      case 'lg': return 'w-6 h-6';
      default: return 'w-5 h-5';
    }
  }, [size]);
  
  return (
    <div className={containerClasses}>
      {/* Mute/unmute button */}
      <button
        onClick={handleMuteToggle}
        disabled={disabled}
        className={muteButtonClasses}
        title={audioState.enabled ? 'Mute microphone' : 'Unmute microphone'}
        aria-label={audioState.enabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {audioState.enabled ? (
          <Mic className={iconSize} />
        ) : (
          <MicOff className={iconSize} />
        )}
      </button>
      
      {/* Audio level meter */}
      {showLevelMeter && variant !== 'minimal' && (
        <AudioLevelMeter
          level={audioLevel}
          isSpeaking={isSpeaking}
          size={size}
        />
      )}
      
      {/* Permission error display */}
      {permissionError && variant !== 'minimal' && (
        <div className="flex items-center text-error-600">
          <VolumeX className="w-4 h-4 mr-1" />
          <span className="text-xs">Permission denied</span>
        </div>
      )}
      
      {/* Device selector */}
      {showDeviceSelector && variant !== 'minimal' && (
        <DeviceSelector
          devices={availableDevices}
          selectedDevice={selectedDevice}
          onDeviceChange={handleDeviceSelect}
          isOpen={showDeviceMenu}
          onToggle={toggleDeviceMenu}
          size={size}
        />
      )}
      
      {/* Connection status indicator */}
      {variant !== 'minimal' && (
        <div className={`
          w-2 h-2 rounded-full
          ${audioState.enabled ? 'bg-success-500' : 'bg-gray-400'}
          ${getTransitionClasses.colors('fast')}
        `} />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    shallowEqual(prevProps.audioState, nextProps.audioState) &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.showDeviceSelector === nextProps.showDeviceSelector &&
    prevProps.showLevelMeter === nextProps.showLevelMeter &&
    prevProps.className === nextProps.className &&
    prevProps.size === nextProps.size &&
    prevProps.variant === nextProps.variant
  );
});

OptimizedAudioControls.displayName = 'OptimizedAudioControls';
