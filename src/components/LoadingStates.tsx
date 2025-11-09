import React from 'react';
import { Loader2, Users, MessageCircle, Mic, MicOff, Wifi } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
};

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`text-center py-8 px-4 ${className}`}>
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

// Specific empty states for different components
export const EmptyParticipants: React.FC = () => (
  <EmptyState
    icon={<Users className="w-6 h-6 text-gray-400" />}
    title="No participants yet"
    description="Waiting for others to join the conversation"
  />
);

export const EmptyChat: React.FC = () => (
  <EmptyState
    icon={<MessageCircle className="w-6 h-6 text-gray-400" />}
    title="No messages yet"
    description="Start the conversation by sending a message"
  />
);

export const AudioPermissionRequired: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    icon={<MicOff className="w-6 h-6 text-red-400" />}
    title="Microphone access required"
    description="Please allow microphone access to join the voice chat"
    action={onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
      >
        Try Again
      </button>
    )}
  />
);

export const ConnectionLost: React.FC<{ onReconnect?: () => void }> = ({ onReconnect }) => (
  <EmptyState
    icon={<Wifi className="w-6 h-6 text-yellow-500" />}
    title="Connection lost"
    description="Trying to reconnect to the voice chat..."
    action={onReconnect && (
      <button
        onClick={onReconnect}
        className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
      >
        Reconnect Now
      </button>
    )}
  />
);

interface LoadingOverlayProps {
  message?: string;
  isVisible: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = 'Loading...', 
  isVisible 
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
      <div className="text-center">
        <LoadingSpinner size="lg" className="text-blue-600 mx-auto mb-4" />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', lines = 1 }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 rounded ${
            i === lines - 1 ? 'h-4' : 'h-4 mb-2'
          } ${lines === 1 ? 'w-full' : i === 0 ? 'w-3/4' : i === lines - 1 ? 'w-1/2' : 'w-full'}`}
        />
      ))}
    </div>
  );
};

export const ParticipantSkeleton: React.FC = () => (
  <div className="flex items-center space-x-3 p-3">
    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
    <div className="flex-1">
      <Skeleton lines={2} />
    </div>
  </div>
);

export const ChatMessageSkeleton: React.FC = () => (
  <div className="flex space-x-3 p-3">
    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
    <div className="flex-1">
      <Skeleton lines={2} />
    </div>
  </div>
);
