/**
 * Browser Compatibility Warning Component
 * Displays compatibility issues and provides guidance
 */

import React, { useState } from 'react';
import { AlertTriangle, X, ExternalLink, RefreshCw, Info } from 'lucide-react';
import { useCompatibilityCheck, BrowserDetection } from '../utils/browserCompatibility';
import { getAnimationClasses, getTransitionClasses } from '../utils/animations';
import { useScreenReader } from '../utils/accessibility';

interface CompatibilityWarningProps {
  onDismiss?: () => void;
  showDetails?: boolean;
}

export const CompatibilityWarning: React.FC<CompatibilityWarningProps> = ({
  onDismiss,
  showDetails = true
}) => {
  const { isCompatible, issues, isLoading } = useCompatibilityCheck();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const { announceError } = useScreenReader();
  
  // Don't show if compatible or dismissed
  if (isLoading || isCompatible || isDismissed) {
    return null;
  }
  
  // Announce compatibility issues to screen readers
  React.useEffect(() => {
    if (!isCompatible && issues.length > 0) {
      announceError(`Browser compatibility issues detected: ${issues.join(', ')}`);
    }
  }, [isCompatible, issues, announceError]);
  
  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };
  
  const handleRetry = () => {
    window.location.reload();
  };
  
  // Get browser-specific download links
  const getBrowserDownloadLinks = () => {
    return [
      {
        name: 'Google Chrome',
        url: 'https://www.google.com/chrome/',
        recommended: true
      },
      {
        name: 'Mozilla Firefox',
        url: 'https://www.mozilla.org/firefox/',
        recommended: true
      },
      {
        name: 'Microsoft Edge',
        url: 'https://www.microsoft.com/edge',
        recommended: true
      },
      {
        name: 'Safari',
        url: 'https://www.apple.com/safari/',
        recommended: false,
        note: 'macOS/iOS only'
      }
    ];
  };
  
  const browserLinks = getBrowserDownloadLinks();
  const currentBrowser = BrowserDetection.getBrowser();
  const currentVersion = BrowserDetection.getBrowserVersion();
  
  return (
    <div className={`
      fixed top-0 left-0 right-0 z-50 bg-warning-50 border-b border-warning-200
      ${getAnimationClasses.slideIn('normal')}
    `}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-start justify-between">
          {/* Warning Content */}
          <div className="flex items-start flex-1">
            <AlertTriangle 
              className="w-5 h-5 text-warning-600 mt-0.5 mr-3 flex-shrink-0" 
              aria-hidden="true" 
            />
            
            <div className="flex-1">
              <h3 className="text-sm font-medium text-warning-800 mb-1">
                Browser Compatibility Issues Detected
              </h3>
              
              <div className="text-sm text-warning-700">
                <p className="mb-2">
                  Your browser ({currentBrowser} {currentVersion}) may not support all features 
                  required for the best experience.
                </p>
                
                {/* Issue List */}
                <div className="space-y-1">
                  {issues.slice(0, showFullDetails ? issues.length : 2).map((issue, index) => (
                    <p key={index} className="flex items-start">
                      <span className="inline-block w-1.5 h-1.5 bg-warning-600 rounded-full mt-2 mr-2 flex-shrink-0" />
                      {issue}
                    </p>
                  ))}
                  
                  {!showFullDetails && issues.length > 2 && (
                    <button
                      onClick={() => setShowFullDetails(true)}
                      className={`
                        text-warning-800 underline hover:no-underline
                        ${getTransitionClasses.colors('fast')}
                        focus:outline-none focus:ring-2 focus:ring-warning-500 rounded
                      `}
                    >
                      Show {issues.length - 2} more issue{issues.length - 2 > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
                
                {/* Recommendations */}
                {showDetails && (
                  <div className="mt-3 pt-3 border-t border-warning-200">
                    <h4 className="font-medium text-warning-800 mb-2">
                      Recommended Actions:
                    </h4>
                    
                    <div className="space-y-2">
                      {/* Update Current Browser */}
                      <div>
                        <p className="font-medium">1. Update your current browser:</p>
                        <button
                          onClick={handleRetry}
                          className={`
                            inline-flex items-center mt-1 px-3 py-1 text-xs
                            bg-warning-600 text-white rounded-md
                            ${getTransitionClasses.all('fast')}
                            hover:bg-warning-700 focus:outline-none focus:ring-2 focus:ring-warning-500
                          `}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Check Again
                        </button>
                      </div>
                      
                      {/* Switch Browser */}
                      <div>
                        <p className="font-medium">2. Or switch to a supported browser:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {browserLinks.map((browser) => (
                            <a
                              key={browser.name}
                              href={browser.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`
                                inline-flex items-center px-3 py-1 text-xs border rounded-md
                                ${getTransitionClasses.all('fast')}
                                ${browser.recommended
                                  ? 'border-warning-600 text-warning-800 hover:bg-warning-100'
                                  : 'border-warning-400 text-warning-700 hover:bg-warning-50'
                                }
                                focus:outline-none focus:ring-2 focus:ring-warning-500
                              `}
                            >
                              {browser.name}
                              <ExternalLink className="w-3 h-3 ml-1" />
                              {browser.recommended && (
                                <span className="ml-1 text-xs bg-warning-600 text-white px-1 rounded">
                                  Recommended
                                </span>
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                      
                      {/* Continue Anyway */}
                      <div>
                        <p className="font-medium">3. Continue with limited functionality:</p>
                        <button
                          onClick={handleDismiss}
                          className={`
                            inline-flex items-center mt-1 px-3 py-1 text-xs
                            border border-warning-400 text-warning-700 rounded-md
                            ${getTransitionClasses.all('fast')}
                            hover:bg-warning-50 focus:outline-none focus:ring-2 focus:ring-warning-500
                          `}
                        >
                          <Info className="w-3 h-3 mr-1" />
                          Continue Anyway
                        </button>
                        <p className="text-xs text-warning-600 mt-1">
                          Some features may not work properly
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className={`
              ml-4 p-1 text-warning-600 rounded-md
              ${getTransitionClasses.colors('fast')}
              hover:text-warning-800 hover:bg-warning-100
              focus:outline-none focus:ring-2 focus:ring-warning-500
            `}
            aria-label="Dismiss compatibility warning"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
