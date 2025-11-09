/**
 * Enhanced Error Boundary Components
 * Comprehensive error handling with recovery mechanisms
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { getAnimationClasses, getTransitionClasses } from '../utils/animations';
import { logger } from '../utils/logger';

// Error boundary state interface
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

// Error boundary props interface
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

// Error types for better categorization
export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  WEBRTC = 'webrtc',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

// Error classification utility
const classifyError = (error: Error): ErrorType => {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return ErrorType.NETWORK;
  }
  
  if (message.includes('token') || message.includes('auth') || message.includes('unauthorized')) {
    return ErrorType.AUTHENTICATION;
  }
  
  if (message.includes('webrtc') || message.includes('media') || message.includes('track')) {
    return ErrorType.WEBRTC;
  }
  
  if (message.includes('permission') || message.includes('denied') || message.includes('blocked')) {
    return ErrorType.PERMISSION;
  }
  
  return ErrorType.UNKNOWN;
};

// Error recovery suggestions
const getRecoverySuggestions = (errorType: ErrorType): string[] => {
  switch (errorType) {
    case ErrorType.NETWORK:
      return [
        'Check your internet connection',
        'Try refreshing the page',
        'Contact support if the problem persists'
      ];
    
    case ErrorType.AUTHENTICATION:
      return [
        'Try logging in again',
        'Clear your browser cache',
        'Check if your session has expired'
      ];
    
    case ErrorType.WEBRTC:
      return [
        'Check your microphone permissions',
        'Try using a different browser',
        'Ensure your browser supports WebRTC'
      ];
    
    case ErrorType.PERMISSION:
      return [
        'Grant the required permissions',
        'Check your browser settings',
        'Try refreshing and allowing permissions'
      ];
    
    default:
      return [
        'Try refreshing the page',
        'Clear your browser cache',
        'Contact support if the issue continues'
      ];
  }
};

// Error display component
interface ErrorDisplayProps {
  error: Error;
  errorInfo: ErrorInfo;
  errorId: string;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
  onGoHome: () => void;
  onReportError: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorInfo,
  errorId,
  retryCount,
  maxRetries,
  onRetry,
  onGoHome,
  onReportError
}) => {
  const errorType = classifyError(error);
  const suggestions = getRecoverySuggestions(errorType);
  const canRetry = retryCount < maxRetries;
  
  return (
    <div className={`
      min-h-screen flex items-center justify-center bg-gray-50 px-4
      ${getAnimationClasses.fadeIn('normal')}
    `}>
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        {/* Error icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-error-100 mb-4">
          <AlertTriangle className="h-8 w-8 text-error-600" aria-hidden="true" />
        </div>
        
        {/* Error title */}
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h1>
        
        {/* Error description */}
        <p className="text-gray-600 mb-4">
          We encountered an unexpected error. Don't worry, we're working to fix it.
        </p>
        
        {/* Error details (collapsible) */}
        <details className="text-left mb-6 bg-gray-50 rounded-lg p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
            Technical Details
          </summary>
          <div className="mt-2 text-xs text-gray-600 font-mono">
            <p><strong>Error ID:</strong> {errorId}</p>
            <p><strong>Type:</strong> {errorType}</p>
            <p><strong>Message:</strong> {error.message}</p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2">
                <p><strong>Stack:</strong></p>
                <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-32">
                  {error.stack}
                </pre>
              </div>
            )}
          </div>
        </details>
        
        {/* Recovery suggestions */}
        <div className="text-left mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Try these solutions:
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start">
                <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Action buttons */}
        <div className="space-y-3">
          {canRetry && (
            <button
              onClick={onRetry}
              className={`
                w-full flex items-center justify-center px-4 py-2 border border-transparent
                text-sm font-medium rounded-md text-white bg-primary-600
                ${getTransitionClasses.colors('fast')}
                hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again {retryCount > 0 && `(${maxRetries - retryCount} attempts left)`}
            </button>
          )}
          
          <button
            onClick={onGoHome}
            className={`
              w-full flex items-center justify-center px-4 py-2 border border-gray-300
              text-sm font-medium rounded-md text-gray-700 bg-white
              ${getTransitionClasses.colors('fast')}
              hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
            `}
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Home
          </button>
          
          <button
            onClick={onReportError}
            className={`
              w-full flex items-center justify-center px-4 py-2 border border-gray-300
              text-sm font-medium rounded-md text-gray-500 bg-white
              ${getTransitionClasses.colors('fast')}
              hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
            `}
          >
            <Bug className="w-4 h-4 mr-2" />
            Report Issue
          </button>
        </div>
        
        {/* Retry count indicator */}
        {retryCount > 0 && (
          <p className="mt-4 text-xs text-gray-500">
            Retry attempt {retryCount} of {maxRetries}
          </p>
        )}
      </div>
    </div>
  );
};

// Main error boundary class
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }
  
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    logger.error('[ErrorBoundary] Component error caught', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId
    });
    
    // Update state with error info
    this.setState({ errorInfo });
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
    
    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo);
  }
  
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;
    
    // Reset error boundary when props change (if enabled)
    if (hasError && resetOnPropsChange) {
      if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (key, index) => key !== prevProps.resetKeys?.[index]
        );
        
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }
  }
  
  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }
  
  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, you would send this to your error reporting service
    // For now, we'll just log it
    console.group('🚨 Error Boundary Report');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Error ID:', this.state.errorId);
    console.groupEnd();
  };
  
  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    });
  };
  
  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;
    
    if (retryCount < maxRetries) {
      logger.info('[ErrorBoundary] Retrying after error', {
        retryCount: retryCount + 1,
        maxRetries
      });
      
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };
  
  private handleGoHome = () => {
    // Navigate to home or reload the page
    window.location.href = '/';
  };
  
  private handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    if (error && errorInfo && errorId) {
      // Create error report
      const errorReport = {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href
      };
      
      // Copy to clipboard for easy reporting
      navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
        .then(() => {
          alert('Error report copied to clipboard. Please share this with support.');
        })
        .catch(() => {
          console.log('Error report:', errorReport);
          alert('Error report logged to console. Please share the console output with support.');
        });
    }
  };
  
  render() {
    const { hasError, error, errorInfo, errorId, retryCount } = this.state;
    const { children, fallback, maxRetries = 3 } = this.props;
    
    if (hasError && error && errorInfo && errorId) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }
      
      // Use default error display
      return (
        <ErrorDisplay
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          retryCount={retryCount}
          maxRetries={maxRetries}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          onReportError={this.handleReportError}
        />
      );
    }
    
    return children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Hook for error reporting from functional components
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: any) => {
    logger.error('[useErrorHandler] Manual error report', {
      error: error.message,
      stack: error.stack,
      errorInfo
    });
    
    // In a real application, report to error monitoring service
    console.error('Manual error report:', { error, errorInfo });
  }, []);
  
  return handleError;
};
