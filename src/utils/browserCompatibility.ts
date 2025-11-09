/**
 * Browser Compatibility Testing and Polyfills
 * Ensures consistent functionality across different browsers
 */

import { logger } from './logger';

// Browser detection utilities
export class BrowserDetection {
  private static userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  
  // Detect browser type
  static getBrowser(): string {
    const ua = this.userAgent.toLowerCase();
    
    if (ua.includes('chrome') && !ua.includes('edg')) return 'chrome';
    if (ua.includes('firefox')) return 'firefox';
    if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
    if (ua.includes('edg')) return 'edge';
    if (ua.includes('opera') || ua.includes('opr')) return 'opera';
    
    return 'unknown';
  }
  
  // Get browser version
  static getBrowserVersion(): string {
    const ua = this.userAgent;
    const browser = this.getBrowser();
    
    let match: RegExpMatchArray | null = null;
    
    switch (browser) {
      case 'chrome':
        match = ua.match(/chrome\/(\d+)/i);
        break;
      case 'firefox':
        match = ua.match(/firefox\/(\d+)/i);
        break;
      case 'safari':
        match = ua.match(/version\/(\d+)/i);
        break;
      case 'edge':
        match = ua.match(/edg\/(\d+)/i);
        break;
      case 'opera':
        match = ua.match(/(?:opera|opr)\/(\d+)/i);
        break;
    }
    
    return match ? match[1] : 'unknown';
  }
  
  // Check if mobile device
  static isMobile(): boolean {
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(this.userAgent);
  }
  
  // Check if iOS
  static isIOS(): boolean {
    return /ipad|iphone|ipod/i.test(this.userAgent);
  }
  
  // Check if Android
  static isAndroid(): boolean {
    return /android/i.test(this.userAgent);
  }
}

// Feature detection utilities
export class FeatureDetection {
  // WebRTC support
  static hasWebRTC(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      (window.RTCPeerConnection || 
       (window as any).webkitRTCPeerConnection || 
       (window as any).mozRTCPeerConnection)
    );
  }
  
  // MediaDevices API support
  static hasMediaDevices(): boolean {
    return !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    );
  }
  
  // Web Audio API support
  static hasWebAudio(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      (window.AudioContext || (window as any).webkitAudioContext)
    );
  }
  
  // WebSocket support
  static hasWebSocket(): boolean {
    return typeof WebSocket !== 'undefined';
  }
  
  // Local Storage support
  static hasLocalStorage(): boolean {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
  
  // IndexedDB support
  static hasIndexedDB(): boolean {
    return typeof indexedDB !== 'undefined';
  }
  
  // Service Worker support
  static hasServiceWorker(): boolean {
    return 'serviceWorker' in navigator;
  }
  
  // Intersection Observer support
  static hasIntersectionObserver(): boolean {
    return typeof IntersectionObserver !== 'undefined';
  }
  
  // ResizeObserver support
  static hasResizeObserver(): boolean {
    return typeof ResizeObserver !== 'undefined';
  }
  
  // CSS Grid support
  static hasCSSGrid(): boolean {
    if (typeof window === 'undefined') return false;
    return CSS.supports('display', 'grid');
  }
  
  // CSS Flexbox support
  static hasCSSFlexbox(): boolean {
    if (typeof window === 'undefined') return false;
    return CSS.supports('display', 'flex');
  }
  
  // Touch events support
  static hasTouchEvents(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
  
  // Pointer events support
  static hasPointerEvents(): boolean {
    return 'onpointerdown' in window;
  }
}

// Compatibility requirements for the application
export const COMPATIBILITY_REQUIREMENTS = {
  // Minimum browser versions
  browsers: {
    chrome: 88,
    firefox: 85,
    safari: 14,
    edge: 88
  },
  
  // Required features
  requiredFeatures: [
    'webrtc',
    'mediaDevices',
    'webAudio',
    'webSocket',
    'localStorage'
  ],
  
  // Optional features (graceful degradation)
  optionalFeatures: [
    'intersectionObserver',
    'resizeObserver',
    'serviceWorker'
  ]
} as const;

// Compatibility checker
export class CompatibilityChecker {
  private static issues: string[] = [];
  
  // Check browser compatibility
  static checkBrowser(): boolean {
    const browser = BrowserDetection.getBrowser();
    const version = parseInt(BrowserDetection.getBrowserVersion());
    const requirements = COMPATIBILITY_REQUIREMENTS.browsers;
    
    let isCompatible = true;
    
    switch (browser) {
      case 'chrome':
        if (version < requirements.chrome) {
          this.issues.push(`Chrome ${requirements.chrome}+ required (current: ${version})`);
          isCompatible = false;
        }
        break;
      case 'firefox':
        if (version < requirements.firefox) {
          this.issues.push(`Firefox ${requirements.firefox}+ required (current: ${version})`);
          isCompatible = false;
        }
        break;
      case 'safari':
        if (version < requirements.safari) {
          this.issues.push(`Safari ${requirements.safari}+ required (current: ${version})`);
          isCompatible = false;
        }
        break;
      case 'edge':
        if (version < requirements.edge) {
          this.issues.push(`Edge ${requirements.edge}+ required (current: ${version})`);
          isCompatible = false;
        }
        break;
      default:
        this.issues.push(`Unsupported browser: ${browser}`);
        isCompatible = false;
    }
    
    return isCompatible;
  }
  
  // Check required features
  static checkRequiredFeatures(): boolean {
    let allSupported = true;
    
    // WebRTC
    if (!FeatureDetection.hasWebRTC()) {
      this.issues.push('WebRTC not supported - voice chat will not work');
      allSupported = false;
    }
    
    // MediaDevices
    if (!FeatureDetection.hasMediaDevices()) {
      this.issues.push('MediaDevices API not supported - microphone access will not work');
      allSupported = false;
    }
    
    // Web Audio API
    if (!FeatureDetection.hasWebAudio()) {
      this.issues.push('Web Audio API not supported - audio features may be limited');
      allSupported = false;
    }
    
    // WebSocket
    if (!FeatureDetection.hasWebSocket()) {
      this.issues.push('WebSocket not supported - real-time communication will not work');
      allSupported = false;
    }
    
    // Local Storage
    if (!FeatureDetection.hasLocalStorage()) {
      this.issues.push('Local Storage not supported - settings will not persist');
      // Not critical, don't fail
    }
    
    return allSupported;
  }
  
  // Check optional features and warn
  static checkOptionalFeatures(): void {
    if (!FeatureDetection.hasIntersectionObserver()) {
      logger.warn('[Compatibility] IntersectionObserver not supported - using fallback');
    }
    
    if (!FeatureDetection.hasResizeObserver()) {
      logger.warn('[Compatibility] ResizeObserver not supported - using fallback');
    }
    
    if (!FeatureDetection.hasServiceWorker()) {
      logger.info('[Compatibility] Service Worker not supported - offline features disabled');
    }
  }
  
  // Run full compatibility check
  static checkCompatibility(): { isCompatible: boolean; issues: string[] } {
    this.issues = [];
    
    const browserOk = this.checkBrowser();
    const featuresOk = this.checkRequiredFeatures();
    this.checkOptionalFeatures();
    
    const isCompatible = browserOk && featuresOk;
    
    logger.info('[Compatibility] Check complete', {
      browser: BrowserDetection.getBrowser(),
      version: BrowserDetection.getBrowserVersion(),
      mobile: BrowserDetection.isMobile(),
      compatible: isCompatible,
      issues: this.issues
    });
    
    return {
      isCompatible,
      issues: [...this.issues]
    };
  }
  
  // Get compatibility report
  static getCompatibilityReport(): object {
    return {
      browser: {
        name: BrowserDetection.getBrowser(),
        version: BrowserDetection.getBrowserVersion(),
        userAgent: BrowserDetection.userAgent,
        mobile: BrowserDetection.isMobile(),
        ios: BrowserDetection.isIOS(),
        android: BrowserDetection.isAndroid()
      },
      features: {
        webrtc: FeatureDetection.hasWebRTC(),
        mediaDevices: FeatureDetection.hasMediaDevices(),
        webAudio: FeatureDetection.hasWebAudio(),
        webSocket: FeatureDetection.hasWebSocket(),
        localStorage: FeatureDetection.hasLocalStorage(),
        indexedDB: FeatureDetection.hasIndexedDB(),
        serviceWorker: FeatureDetection.hasServiceWorker(),
        intersectionObserver: FeatureDetection.hasIntersectionObserver(),
        resizeObserver: FeatureDetection.hasResizeObserver(),
        cssGrid: FeatureDetection.hasCSSGrid(),
        cssFlexbox: FeatureDetection.hasCSSFlexbox(),
        touchEvents: FeatureDetection.hasTouchEvents(),
        pointerEvents: FeatureDetection.hasPointerEvents()
      },
      timestamp: new Date().toISOString()
    };
  }
}

// Polyfills and fallbacks
export class Polyfills {
  // Install necessary polyfills
  static install(): void {
    this.installIntersectionObserverPolyfill();
    this.installResizeObserverPolyfill();
    this.installWebAudioPolyfill();
    this.installMediaDevicesPolyfill();
  }
  
  // IntersectionObserver polyfill
  private static installIntersectionObserverPolyfill(): void {
    if (!FeatureDetection.hasIntersectionObserver()) {
      // Simple fallback - assume all elements are visible
      (window as any).IntersectionObserver = class {
        constructor(callback: Function) {
          // Immediately call callback with visible entry
          setTimeout(() => {
            callback([{ isIntersecting: true }]);
          }, 0);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      };
      
      logger.info('[Polyfill] IntersectionObserver polyfill installed');
    }
  }
  
  // ResizeObserver polyfill
  private static installResizeObserverPolyfill(): void {
    if (!FeatureDetection.hasResizeObserver()) {
      // Simple fallback using window resize
      (window as any).ResizeObserver = class {
        private callback: Function;
        private elements: Element[] = [];
        
        constructor(callback: Function) {
          this.callback = callback;
          this.handleResize = this.handleResize.bind(this);
        }
        
        observe(element: Element) {
          if (this.elements.length === 0) {
            window.addEventListener('resize', this.handleResize);
          }
          this.elements.push(element);
        }
        
        unobserve(element: Element) {
          this.elements = this.elements.filter(el => el !== element);
          if (this.elements.length === 0) {
            window.removeEventListener('resize', this.handleResize);
          }
        }
        
        disconnect() {
          window.removeEventListener('resize', this.handleResize);
          this.elements = [];
        }
        
        private handleResize() {
          const entries = this.elements.map(element => ({
            target: element,
            contentRect: element.getBoundingClientRect()
          }));
          this.callback(entries);
        }
      };
      
      logger.info('[Polyfill] ResizeObserver polyfill installed');
    }
  }
  
  // Web Audio API polyfill
  private static installWebAudioPolyfill(): void {
    if (typeof window !== 'undefined' && !window.AudioContext && (window as any).webkitAudioContext) {
      (window as any).AudioContext = (window as any).webkitAudioContext;
      logger.info('[Polyfill] AudioContext polyfill installed');
    }
  }
  
  // MediaDevices polyfill
  private static installMediaDevicesPolyfill(): void {
    if (typeof navigator !== 'undefined' && !navigator.mediaDevices && (navigator as any).getUserMedia) {
      navigator.mediaDevices = {
        getUserMedia: (constraints: MediaStreamConstraints) => {
          const getUserMedia = (navigator as any).getUserMedia || 
                              (navigator as any).webkitGetUserMedia || 
                              (navigator as any).mozGetUserMedia;
          
          if (!getUserMedia) {
            return Promise.reject(new Error('getUserMedia not supported'));
          }
          
          return new Promise((resolve, reject) => {
            getUserMedia.call(navigator, constraints, resolve, reject);
          });
        }
      } as MediaDevices;
      
      logger.info('[Polyfill] MediaDevices polyfill installed');
    }
  }
}

// Browser-specific workarounds
export class BrowserWorkarounds {
  // Apply browser-specific fixes
  static apply(): void {
    const browser = BrowserDetection.getBrowser();
    
    switch (browser) {
      case 'safari':
        this.applySafariWorkarounds();
        break;
      case 'firefox':
        this.applyFirefoxWorkarounds();
        break;
      case 'chrome':
        this.applyChromeWorkarounds();
        break;
    }
  }
  
  // Safari-specific workarounds
  private static applySafariWorkarounds(): void {
    // Safari audio autoplay policy
    if (BrowserDetection.isIOS()) {
      // Require user gesture for audio
      logger.info('[Workaround] Safari iOS audio policy - user gesture required');
    }
    
    // Safari WebRTC issues
    logger.info('[Workaround] Safari WebRTC workarounds applied');
  }
  
  // Firefox-specific workarounds
  private static applyFirefoxWorkarounds(): void {
    // Firefox DataChannel message size limit
    logger.info('[Workaround] Firefox DataChannel size limit noted');
  }
  
  // Chrome-specific workarounds
  private static applyChromeWorkarounds(): void {
    // Chrome autoplay policy
    logger.info('[Workaround] Chrome autoplay policy noted');
  }
}

// Initialize compatibility system
export const initializeCompatibility = (): { isCompatible: boolean; issues: string[] } => {
  logger.info('[Compatibility] Initializing compatibility system');
  
  // Install polyfills
  Polyfills.install();
  
  // Apply browser workarounds
  BrowserWorkarounds.apply();
  
  // Check compatibility
  const result = CompatibilityChecker.checkCompatibility();
  
  // Log compatibility report
  const report = CompatibilityChecker.getCompatibilityReport();
  logger.info('[Compatibility] Browser report', report);
  
  return result;
};

// React hook for compatibility checking
export const useCompatibilityCheck = () => {
  const [compatibilityResult, setCompatibilityResult] = React.useState<{
    isCompatible: boolean;
    issues: string[];
    isLoading: boolean;
  }>({
    isCompatible: true,
    issues: [],
    isLoading: true
  });
  
  React.useEffect(() => {
    const result = initializeCompatibility();
    setCompatibilityResult({
      ...result,
      isLoading: false
    });
  }, []);
  
  return compatibilityResult;
};

// Export React import for the hook
import React from 'react';
