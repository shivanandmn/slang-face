/**
 * Toast Notification System
 * Provides user feedback with modern animations and accessibility
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { getAnimationClasses, getTransitionClasses } from '../utils/animations';

// Toast types and interfaces
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

// Toast context
const ToastContext = createContext<ToastContextType | null>(null);

// Toast configuration
const TOAST_CONFIG = {
  defaultDuration: 5000,
  maxToasts: 5,
  position: 'top-right' as const,
  animations: {
    enter: getAnimationClasses.slideIn('fast'),
    exit: getAnimationClasses.slideOut('fast')
  }
};

// Toast icons mapping
const ToastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
} as const;

// Toast styling classes
const getToastClasses = (type: ToastType) => {
  const baseClasses = `
    relative flex items-start p-4 rounded-lg shadow-lg border
    ${getTransitionClasses.all('fast')} ${getAnimationClasses.slideIn('fast')}
    backdrop-blur-sm max-w-md w-full
  `;
  
  const typeClasses = {
    success: 'bg-success-50 border-success-200 text-success-800',
    error: 'bg-error-50 border-error-200 text-error-800',
    warning: 'bg-warning-50 border-warning-200 text-warning-800',
    info: 'bg-primary-50 border-primary-200 text-primary-800'
  };
  
  return `${baseClasses} ${typeClasses[type]}`;
};

const getIconClasses = (type: ToastType) => {
  const baseClasses = 'flex-shrink-0 w-5 h-5 mt-0.5';
  
  const typeClasses = {
    success: 'text-success-500',
    error: 'text-error-500',
    warning: 'text-warning-500',
    info: 'text-primary-500'
  };
  
  return `${baseClasses} ${typeClasses[type]}`;
};

// Individual toast component
interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = ToastIcons[toast.type];
  
  // Auto-remove toast after duration
  useEffect(() => {
    if (!toast.persistent && toast.duration !== 0) {
      const timer = setTimeout(() => {
        handleRemove();
      }, toast.duration || TOAST_CONFIG.defaultDuration);
      
      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.persistent]);
  
  const handleRemove = useCallback(() => {
    setIsExiting(true);
    // Wait for exit animation to complete
    setTimeout(() => {
      onRemove(toast.id);
    }, 150);
  }, [toast.id, onRemove]);
  
  return (
    <div
      className={`
        ${getToastClasses(toast.type)}
        ${isExiting ? getAnimationClasses.slideOut('fast') : ''}
      `}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Icon */}
      <Icon className={getIconClasses(toast.type)} aria-hidden="true" />
      
      {/* Content */}
      <div className="ml-3 flex-1 min-w-0">
        <h4 className="font-medium text-sm leading-5">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="mt-1 text-sm opacity-90 leading-5">
            {toast.message}
          </p>
        )}
        
        {/* Action button */}
        {toast.action && (
          <div className="mt-3">
            <button
              onClick={toast.action.onClick}
              className={`
                text-sm font-medium underline
                ${getTransitionClasses.colors('fast')}
                hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2
                ${toast.type === 'success' ? 'text-success-700 focus:ring-success-500' : ''}
                ${toast.type === 'error' ? 'text-error-700 focus:ring-error-500' : ''}
                ${toast.type === 'warning' ? 'text-warning-700 focus:ring-warning-500' : ''}
                ${toast.type === 'info' ? 'text-primary-700 focus:ring-primary-500' : ''}
              `}
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>
      
      {/* Close button */}
      <button
        onClick={handleRemove}
        className={`
          ml-4 flex-shrink-0 p-1 rounded-md
          ${getTransitionClasses.colors('fast')}
          hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2
          ${toast.type === 'success' ? 'focus:ring-success-500' : ''}
          ${toast.type === 'error' ? 'focus:ring-error-500' : ''}
          ${toast.type === 'warning' ? 'focus:ring-warning-500' : ''}
          ${toast.type === 'info' ? 'focus:ring-primary-500' : ''}
        `}
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4 opacity-60" />
      </button>
    </div>
  );
};

// Toast container component
const ToastContainer: React.FC = () => {
  const context = useContext(ToastContext);
  
  if (!context || context.toasts.length === 0) {
    return null;
  }
  
  return (
    <div
      className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {context.toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={context.removeToast} />
        </div>
      ))}
    </div>
  );
};

// Toast provider component
interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const addToast = useCallback((toastData: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setToasts(prev => {
      const newToasts = [...prev, { ...toastData, id }];
      
      // Limit number of toasts
      if (newToasts.length > TOAST_CONFIG.maxToasts) {
        return newToasts.slice(-TOAST_CONFIG.maxToasts);
      }
      
      return newToasts;
    });
    
    return id;
  }, []);
  
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);
  
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);
  
  const contextValue: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts
  };
  
  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Custom hook for using toasts
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  // Convenience methods for different toast types
  const toast = {
    success: (title: string, message?: string, options?: Partial<Toast>) =>
      context.addToast({ type: 'success', title, message, ...options }),
    
    error: (title: string, message?: string, options?: Partial<Toast>) =>
      context.addToast({ type: 'error', title, message, ...options }),
    
    warning: (title: string, message?: string, options?: Partial<Toast>) =>
      context.addToast({ type: 'warning', title, message, ...options }),
    
    info: (title: string, message?: string, options?: Partial<Toast>) =>
      context.addToast({ type: 'info', title, message, ...options }),
    
    custom: (toastData: Omit<Toast, 'id'>) =>
      context.addToast(toastData)
  };
  
  return {
    ...context,
    toast
  };
};

// Utility functions for common toast scenarios
export const toastUtils = {
  // Connection status toasts
  connectionSuccess: (useToastHook: ReturnType<typeof useToast>) => {
    useToastHook.toast.success(
      'Connected successfully',
      'You are now connected to the room'
    );
  },
  
  connectionError: (useToastHook: ReturnType<typeof useToast>, error?: string) => {
    useToastHook.toast.error(
      'Connection failed',
      error || 'Unable to connect to the room. Please try again.',
      {
        persistent: true,
        action: {
          label: 'Retry',
          onClick: () => window.location.reload()
        }
      }
    );
  },
  
  // Audio permission toasts
  audioPermissionGranted: (useToastHook: ReturnType<typeof useToast>) => {
    useToastHook.toast.success(
      'Microphone access granted',
      'You can now speak in the room'
    );
  },
  
  audioPermissionDenied: (useToastHook: ReturnType<typeof useToast>) => {
    useToastHook.toast.warning(
      'Microphone access denied',
      'You won\'t be able to speak. Check your browser settings.',
      { persistent: true }
    );
  },
  
  // Chat message toasts
  messageDelivered: (useToastHook: ReturnType<typeof useToast>) => {
    useToastHook.toast.success('Message sent', undefined, { duration: 2000 });
  },
  
  messageFailed: (useToastHook: ReturnType<typeof useToast>) => {
    useToastHook.toast.error(
      'Message failed to send',
      'Please check your connection and try again'
    );
  },
  
  // Network status toasts
  networkReconnected: (useToastHook: ReturnType<typeof useToast>) => {
    useToastHook.toast.success(
      'Connection restored',
      'You are back online'
    );
  },
  
  networkDisconnected: (useToastHook: ReturnType<typeof useToast>) => {
    useToastHook.toast.warning(
      'Connection lost',
      'Attempting to reconnect...',
      { persistent: true }
    );
  }
};
