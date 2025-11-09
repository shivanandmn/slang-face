/**
 * Accessible Join Form Component
 * WCAG 2.1 AA compliant form with enhanced accessibility features
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, Mic, MicOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useRoomConnection, useRoomError } from '../contexts/RoomContext';
import { 
  useScreenReader, 
  useKeyboardNavigation, 
  useFocus,
  useReducedMotion,
  AccessibilityValidator
} from '../utils/accessibility';
import { getAnimationClasses, getTransitionClasses } from '../utils/animations';
import { useToast } from './Toast';

export const AccessibleJoinForm: React.FC = () => {
  // State management
  const [userName, setUserName] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  // Context hooks
  const { isConnecting, joinRoom } = useRoomConnection();
  const { lastError, clearError } = useRoomError();
  
  // Accessibility hooks
  const { announce, announceError, announceStatus } = useScreenReader();
  const { elementRef: formRef } = useFocus();
  const prefersReducedMotion = useReducedMotion();
  const { toast } = useToast();
  
  // Refs
  const userNameInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  
  // Form validation
  const validateForm = () => {
    const errors: string[] = [];
    
    // Validate username (optional but if provided, should be reasonable)
    if (userName.trim() && userName.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    if (userName.trim() && userName.trim().length > 50) {
      errors.push('Name must be less than 50 characters');
    }
    
    // Check for inappropriate content (basic check)
    const inappropriatePattern = /[<>]/;
    if (userName.trim() && inappropriatePattern.test(userName.trim())) {
      errors.push('Name contains invalid characters');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };
  
  // Keyboard navigation for form
  const { handleKeyDown } = useKeyboardNavigation(
    () => {
      // Enter key - submit form if valid
      if (document.activeElement === submitButtonRef.current) {
        handleSubmit(new Event('submit') as any);
      }
    },
    () => {
      // Space key - submit if on button
      if (document.activeElement === submitButtonRef.current) {
        handleSubmit(new Event('submit') as any);
      }
    },
    () => {
      // Escape key - clear form
      setUserName('');
      clearError();
      setValidationErrors([]);
      announce('Form cleared');
    }
  );
  
  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isConnecting) {
      announce('Connection already in progress', 'assertive');
      return;
    }
    
    setHasInteracted(true);
    
    // Validate form
    if (!validateForm()) {
      announceError('Please fix the form errors before continuing');
      // Focus first error field
      userNameInputRef.current?.focus();
      return;
    }
    
    try {
      clearError();
      announceStatus('Connecting to room', 'Voice Chat');
      
      const finalUserName = userName.trim() || undefined;
      await joinRoom(finalUserName);
      
      announceStatus('Successfully connected to room', 'Voice Chat');
      toast.success('Connected successfully', 'Welcome to the voice chat room');
      
    } catch (err) {
      console.error('[AccessibleJoinForm] Join failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      announceError(errorMessage, 'Voice Chat');
      toast.error('Connection failed', errorMessage);
    }
  };
  
  // Input change handler with validation
  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserName(value);
    
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };
  
  // Input blur handler for validation
  const handleUserNameBlur = () => {
    if (hasInteracted && userName.trim()) {
      validateForm();
    }
  };
  
  // Focus management
  useEffect(() => {
    // Focus username input on mount
    const timer = setTimeout(() => {
      userNameInputRef.current?.focus();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Announce errors to screen readers
  useEffect(() => {
    if (lastError) {
      announceError(lastError, 'Connection');
    }
  }, [lastError, announceError]);
  
  // Announce validation errors
  useEffect(() => {
    if (validationErrors.length > 0) {
      const errorMessage = `Form has ${validationErrors.length} error${validationErrors.length > 1 ? 's' : ''}: ${validationErrors.join(', ')}`;
      announceError(errorMessage);
    }
  }, [validationErrors, announceError]);
  
  // Computed values
  const hasError = !!lastError || validationErrors.length > 0;
  const isFormValid = validationErrors.length === 0;
  const showValidation = hasInteracted || validationErrors.length > 0;
  
  // Animation classes based on user preference
  const animationClass = prefersReducedMotion 
    ? '' 
    : getAnimationClasses.fadeIn('normal');
  
  return (
    <div className={`
      min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 
      flex items-center justify-center p-4 ${animationClass}
    `}>
      <div className={`
        bg-white rounded-2xl shadow-xl p-8 w-full max-w-md
        ${getTransitionClasses.all('normal')}
        focus-within:shadow-2xl
      `}>
        {/* Header */}
        <header className="text-center mb-8">
          <div className={`
            w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4
            ${!prefersReducedMotion ? getAnimationClasses.bounce() : ''}
          `}>
            <Mic className="w-8 h-8 text-primary-600" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Join Voice Chat
          </h1>
          <p className="text-gray-600" id="form-description">
            Connect with others in real-time voice and text conversation
          </p>
        </header>
        
        {/* Error Banner */}
        {hasError && (
          <div 
            className={`
              mb-6 p-4 bg-error-50 border border-error-200 rounded-lg
              ${getAnimationClasses.slideIn('fast')}
            `}
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-error-500 mt-0.5 mr-3 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-error-800 mb-1">
                  {lastError ? 'Connection Error' : 'Form Errors'}
                </h3>
                {lastError && (
                  <p className="text-sm text-error-700 mb-2">{lastError}</p>
                )}
                {validationErrors.length > 0 && (
                  <ul className="text-sm text-error-700 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Main Form */}
        <form 
          ref={formRef}
          onSubmit={handleSubmit} 
          onKeyDown={handleKeyDown}
          className="space-y-6"
          noValidate
          aria-describedby="form-description"
        >
          {/* Username Field */}
          <div>
            <label 
              htmlFor="userName" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your Name 
              <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            
            <div className="relative">
              <User 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
                aria-hidden="true" 
              />
              <input
                ref={userNameInputRef}
                id="userName"
                type="text"
                value={userName}
                onChange={handleUserNameChange}
                onBlur={handleUserNameBlur}
                placeholder="Enter your name or stay anonymous"
                maxLength={50}
                className={`
                  w-full pl-10 pr-4 py-3 border rounded-lg text-sm
                  ${getTransitionClasses.all('fast')}
                  ${validationErrors.length > 0 && showValidation
                    ? 'border-error-300 focus:border-error-500 focus:ring-error-500' 
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  placeholder-gray-400
                `}
                disabled={isConnecting}
                aria-invalid={validationErrors.length > 0}
                aria-describedby={`
                  ${validationErrors.length > 0 ? 'userName-error' : ''}
                  userName-help
                `.trim()}
              />
              
              {/* Validation Status Icon */}
              {showValidation && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {validationErrors.length > 0 ? (
                    <AlertCircle className="w-5 h-5 text-error-500" aria-hidden="true" />
                  ) : userName.trim() && (
                    <CheckCircle className="w-5 h-5 text-success-500" aria-hidden="true" />
                  )}
                </div>
              )}
            </div>
            
            {/* Help Text */}
            <p id="userName-help" className="mt-1 text-xs text-gray-500">
              You can join anonymously or provide a name for others to see
            </p>
            
            {/* Error Messages */}
            {validationErrors.length > 0 && showValidation && (
              <div id="userName-error" className="mt-1">
                {validationErrors.map((error, index) => (
                  <p key={index} className="text-sm text-error-600">
                    {error}
                  </p>
                ))}
              </div>
            )}
          </div>
          
          {/* Submit Button */}
          <button
            ref={submitButtonRef}
            type="submit"
            disabled={isConnecting || !isFormValid}
            className={`
              w-full flex items-center justify-center px-6 py-3 border border-transparent
              text-base font-medium rounded-lg text-white
              ${getTransitionClasses.all('fast')}
              ${isConnecting || !isFormValid
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-primary-600 hover:bg-primary-700 focus:bg-primary-700 active:bg-primary-800'
              }
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
              min-h-[48px]
            `}
            aria-describedby="submit-help"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                <span>Connecting...</span>
                <span className="sr-only">Please wait while we connect you to the room</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" aria-hidden="true" />
                <span>Join Room</span>
              </>
            )}
          </button>
          
          <p id="submit-help" className="text-xs text-gray-500 text-center">
            By joining, you agree to participate respectfully in the conversation
          </p>
        </form>
        
        {/* Keyboard Shortcuts Help */}
        <details className="mt-6">
          <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded">
            Keyboard Shortcuts
          </summary>
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            <p><kbd className="px-1 py-0.5 bg-gray-100 rounded">Enter</kbd> Submit form</p>
            <p><kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> Clear form</p>
            <p><kbd className="px-1 py-0.5 bg-gray-100 rounded">Tab</kbd> Navigate between fields</p>
          </div>
        </details>
      </div>
      
      {/* Skip Link for Screen Readers */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-600 text-white px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>
    </div>
  );
};
