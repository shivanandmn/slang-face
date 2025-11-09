/**
 * Accessibility Utilities
 * WCAG 2.1 AA compliance tools and screen reader support
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';

// WCAG 2.1 AA compliance constants
export const ACCESSIBILITY_CONFIG = {
  // Color contrast ratios
  contrast: {
    normalText: 4.5, // AA standard for normal text
    largeText: 3.0,  // AA standard for large text (18pt+ or 14pt+ bold)
    enhanced: 7.0    // AAA standard
  },
  
  // Focus management
  focus: {
    outlineWidth: '2px',
    outlineOffset: '2px',
    outlineColor: '#2563eb' // Primary-600
  },
  
  // Touch targets (minimum 44x44px)
  touchTarget: {
    minSize: 44
  },
  
  // Animation preferences
  animation: {
    respectReducedMotion: true,
    maxDuration: 5000 // Maximum animation duration in ms
  }
} as const;

// Screen reader utilities
export class ScreenReaderUtils {
  private static announceElement: HTMLElement | null = null;
  
  // Initialize screen reader announcement area
  static init() {
    if (typeof window === 'undefined') return;
    
    if (!this.announceElement) {
      this.announceElement = document.createElement('div');
      this.announceElement.setAttribute('aria-live', 'polite');
      this.announceElement.setAttribute('aria-atomic', 'true');
      this.announceElement.setAttribute('aria-relevant', 'additions text');
      this.announceElement.className = 'sr-only';
      this.announceElement.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `;
      document.body.appendChild(this.announceElement);
    }
  }
  
  // Announce message to screen readers
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    this.init();
    
    if (this.announceElement) {
      this.announceElement.setAttribute('aria-live', priority);
      this.announceElement.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (this.announceElement) {
          this.announceElement.textContent = '';
        }
      }, 1000);
    }
  }
  
  // Announce status changes
  static announceStatus(status: string, context?: string) {
    const message = context ? `${context}: ${status}` : status;
    this.announce(message, 'polite');
  }
  
  // Announce errors
  static announceError(error: string, context?: string) {
    const message = context ? `Error in ${context}: ${error}` : `Error: ${error}`;
    this.announce(message, 'assertive');
  }
  
  // Announce navigation changes
  static announceNavigation(location: string) {
    this.announce(`Navigated to ${location}`, 'polite');
  }
}

// Focus management utilities
export class FocusManager {
  private static focusStack: HTMLElement[] = [];
  
  // Trap focus within an element
  static trapFocus(element: HTMLElement) {
    const focusableElements = this.getFocusableElements(element);
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
      
      if (e.key === 'Escape') {
        this.restoreFocus();
      }
    };
    
    element.addEventListener('keydown', handleKeyDown);
    firstElement.focus();
    
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  }
  
  // Save current focus
  static saveFocus() {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      this.focusStack.push(activeElement);
    }
  }
  
  // Restore previous focus
  static restoreFocus() {
    const previousElement = this.focusStack.pop();
    if (previousElement && document.contains(previousElement)) {
      previousElement.focus();
    }
  }
  
  // Get all focusable elements within a container
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');
    
    return Array.from(container.querySelectorAll(focusableSelectors));
  }
  
  // Check if element is focusable
  static isFocusable(element: HTMLElement): boolean {
    return this.getFocusableElements(element.parentElement || document.body)
      .includes(element);
  }
}

// Color contrast utilities
export class ColorContrastUtils {
  // Calculate relative luminance
  static getRelativeLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;
    
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  
  // Calculate contrast ratio between two colors
  static getContrastRatio(color1: string, color2: string): number {
    const l1 = this.getRelativeLuminance(color1);
    const l2 = this.getRelativeLuminance(color2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }
  
  // Check if contrast meets WCAG standards
  static meetsContrastStandard(
    foreground: string, 
    background: string, 
    level: 'AA' | 'AAA' = 'AA',
    isLargeText = false
  ): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    
    if (level === 'AAA') {
      return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
    }
    
    return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
  }
  
  // Convert hex to RGB
  private static hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  }
}

// Keyboard navigation utilities
export const KeyboardNavigation = {
  // Standard key codes
  keys: {
    ENTER: 'Enter',
    SPACE: ' ',
    ESCAPE: 'Escape',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End',
    TAB: 'Tab'
  },
  
  // Check if key is navigation key
  isNavigationKey(key: string): boolean {
    return Object.values(this.keys).includes(key);
  },
  
  // Check if key is activation key (Enter or Space)
  isActivationKey(key: string): boolean {
    return key === this.keys.ENTER || key === this.keys.SPACE;
  }
};

// React hooks for accessibility

// Hook for managing focus
export const useFocus = () => {
  const elementRef = useRef<HTMLElement>(null);
  
  const focus = useCallback(() => {
    elementRef.current?.focus();
  }, []);
  
  const blur = useCallback(() => {
    elementRef.current?.blur();
  }, []);
  
  const isFocused = useCallback(() => {
    return document.activeElement === elementRef.current;
  }, []);
  
  return { elementRef, focus, blur, isFocused };
};

// Hook for screen reader announcements
export const useScreenReader = () => {
  useEffect(() => {
    ScreenReaderUtils.init();
  }, []);
  
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    ScreenReaderUtils.announce(message, priority);
  }, []);
  
  const announceStatus = useCallback((status: string, context?: string) => {
    ScreenReaderUtils.announceStatus(status, context);
  }, []);
  
  const announceError = useCallback((error: string, context?: string) => {
    ScreenReaderUtils.announceError(error, context);
  }, []);
  
  return { announce, announceStatus, announceError };
};

// Hook for keyboard navigation
export const useKeyboardNavigation = (
  onEnter?: () => void,
  onSpace?: () => void,
  onEscape?: () => void,
  onArrowKeys?: (direction: 'up' | 'down' | 'left' | 'right') => void
) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case KeyboardNavigation.keys.ENTER:
        e.preventDefault();
        onEnter?.();
        break;
      case KeyboardNavigation.keys.SPACE:
        e.preventDefault();
        onSpace?.();
        break;
      case KeyboardNavigation.keys.ESCAPE:
        onEscape?.();
        break;
      case KeyboardNavigation.keys.ARROW_UP:
        e.preventDefault();
        onArrowKeys?.('up');
        break;
      case KeyboardNavigation.keys.ARROW_DOWN:
        e.preventDefault();
        onArrowKeys?.('down');
        break;
      case KeyboardNavigation.keys.ARROW_LEFT:
        e.preventDefault();
        onArrowKeys?.('left');
        break;
      case KeyboardNavigation.keys.ARROW_RIGHT:
        e.preventDefault();
        onArrowKeys?.('right');
        break;
    }
  }, [onEnter, onSpace, onEscape, onArrowKeys]);
  
  return { handleKeyDown };
};

// Hook for focus trap
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    FocusManager.saveFocus();
    const cleanup = FocusManager.trapFocus(containerRef.current);
    
    return () => {
      cleanup?.();
      FocusManager.restoreFocus();
    };
  }, [isActive]);
  
  return containerRef;
};

// Hook for reduced motion preference
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
};

// Accessibility validation utilities
export const AccessibilityValidator = {
  // Validate form accessibility
  validateForm(form: HTMLFormElement): string[] {
    const issues: string[] = [];
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach((input) => {
      const element = input as HTMLInputElement;
      
      // Check for labels
      const hasLabel = element.labels && element.labels.length > 0;
      const hasAriaLabel = element.getAttribute('aria-label');
      const hasAriaLabelledBy = element.getAttribute('aria-labelledby');
      
      if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
        issues.push(`Input "${element.name || element.id}" missing accessible label`);
      }
      
      // Check required fields
      if (element.required && !element.getAttribute('aria-required')) {
        issues.push(`Required input "${element.name || element.id}" missing aria-required`);
      }
    });
    
    return issues;
  },
  
  // Validate button accessibility
  validateButton(button: HTMLButtonElement): string[] {
    const issues: string[] = [];
    
    // Check for accessible name
    const hasText = button.textContent?.trim();
    const hasAriaLabel = button.getAttribute('aria-label');
    const hasAriaLabelledBy = button.getAttribute('aria-labelledby');
    
    if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
      issues.push('Button missing accessible name');
    }
    
    // Check touch target size
    const rect = button.getBoundingClientRect();
    if (rect.width < ACCESSIBILITY_CONFIG.touchTarget.minSize || 
        rect.height < ACCESSIBILITY_CONFIG.touchTarget.minSize) {
      issues.push(`Button too small (${rect.width}x${rect.height}px), minimum 44x44px required`);
    }
    
    return issues;
  }
};

// Accessibility CSS classes
export const a11yClasses = {
  // Screen reader only content
  srOnly: `
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  `,
  
  // Focus visible styles
  focusVisible: `
    outline: ${ACCESSIBILITY_CONFIG.focus.outlineWidth} solid ${ACCESSIBILITY_CONFIG.focus.outlineColor} !important;
    outline-offset: ${ACCESSIBILITY_CONFIG.focus.outlineOffset} !important;
  `,
  
  // Skip link styles
  skipLink: `
    position: absolute;
    top: -40px;
    left: 6px;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 1000;
    
    &:focus {
      top: 6px;
    }
  `
};

// Initialize accessibility features
export const initializeAccessibility = () => {
  if (typeof window === 'undefined') return;
  
  // Initialize screen reader utilities
  ScreenReaderUtils.init();
  
  // Add focus-visible polyfill styles
  const style = document.createElement('style');
  style.textContent = `
    .focus-visible {
      ${a11yClasses.focusVisible}
    }
    
    .sr-only {
      ${a11yClasses.srOnly}
    }
  `;
  document.head.appendChild(style);
  
  // Add skip link if not present
  if (!document.querySelector('.skip-link')) {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Skip to main content';
    skipLink.className = 'skip-link sr-only';
    skipLink.style.cssText = a11yClasses.skipLink;
    document.body.insertBefore(skipLink, document.body.firstChild);
  }
};
