/**
 * Animation Utilities for Enhanced UI/UX
 * Provides smooth transitions and micro-interactions
 */

// Animation configuration constants
export const ANIMATION_CONFIG = {
  // Duration presets
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 700
  },
  
  // Easing functions
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  }
} as const;

// CSS class generators for animations
export const getAnimationClasses = {
  // Fade animations
  fadeIn: (duration: keyof typeof ANIMATION_CONFIG.duration = 'normal') => 
    `animate-fade-in duration-${duration}`,
  
  fadeOut: (duration: keyof typeof ANIMATION_CONFIG.duration = 'normal') => 
    `animate-fade-out duration-${duration}`,
  
  // Slide animations
  slideIn: (duration: keyof typeof ANIMATION_CONFIG.duration = 'normal') => 
    `animate-slide-in duration-${duration}`,
  
  slideOut: (duration: keyof typeof ANIMATION_CONFIG.duration = 'normal') => 
    `animate-slide-out duration-${duration}`,
  
  // Scale animations
  scaleIn: () => 'transform transition-transform duration-300 ease-out scale-95 hover:scale-100',
  scaleOut: () => 'transform transition-transform duration-300 ease-in scale-100 hover:scale-95',
  
  // Bounce animation
  bounce: () => 'animate-bounce-subtle',
  
  // Pulse animations
  pulse: () => 'animate-pulse-slow',
  
  // Spin animations
  spin: () => 'animate-spin-slow',
  
  // Hover effects
  hoverLift: () => 'transform transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg',
  hoverGlow: () => 'transition-all duration-300 ease-out hover:shadow-lg hover:shadow-primary-500/25',
  
  // Focus effects
  focusRing: () => 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  
  // Loading states
  shimmer: () => 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]'
};

// Transition utilities
export const getTransitionClasses = {
  // Basic transitions
  all: (duration: keyof typeof ANIMATION_CONFIG.duration = 'normal') => 
    `transition-all duration-${duration}`,
  
  colors: (duration: keyof typeof ANIMATION_CONFIG.duration = 'normal') => 
    `transition-colors duration-${duration}`,
  
  transform: (duration: keyof typeof ANIMATION_CONFIG.duration = 'normal') => 
    `transition-transform duration-${duration}`,
  
  opacity: (duration: keyof typeof ANIMATION_CONFIG.duration = 'normal') => 
    `transition-opacity duration-${duration}`,
  
  // Smooth height transitions
  height: () => 'transition-[height] duration-300 ease-in-out',
  
  // Smooth width transitions
  width: () => 'transition-[width] duration-300 ease-in-out'
};

// Animation state management
export class AnimationManager {
  private activeAnimations = new Set<string>();
  
  // Register an animation
  register(id: string): void {
    this.activeAnimations.add(id);
  }
  
  // Unregister an animation
  unregister(id: string): void {
    this.activeAnimations.delete(id);
  }
  
  // Check if animation is active
  isActive(id: string): boolean {
    return this.activeAnimations.has(id);
  }
  
  // Clear all animations
  clear(): void {
    this.activeAnimations.clear();
  }
  
  // Get active animation count
  getActiveCount(): number {
    return this.activeAnimations.size;
  }
}

// Global animation manager instance
export const animationManager = new AnimationManager();

// Utility functions for programmatic animations
export const animateElement = (
  element: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions = {}
): Animation => {
  const defaultOptions: KeyframeAnimationOptions = {
    duration: ANIMATION_CONFIG.duration.normal,
    easing: ANIMATION_CONFIG.easing.easeInOut,
    fill: 'forwards'
  };
  
  return element.animate(keyframes, { ...defaultOptions, ...options });
};

// Common animation presets
export const animationPresets = {
  // Fade in from bottom
  fadeInUp: (element: HTMLElement) => 
    animateElement(element, [
      { opacity: 0, transform: 'translateY(20px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ]),
  
  // Fade out to top
  fadeOutUp: (element: HTMLElement) => 
    animateElement(element, [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-20px)' }
    ]),
  
  // Scale in
  scaleIn: (element: HTMLElement) => 
    animateElement(element, [
      { opacity: 0, transform: 'scale(0.8)' },
      { opacity: 1, transform: 'scale(1)' }
    ]),
  
  // Scale out
  scaleOut: (element: HTMLElement) => 
    animateElement(element, [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(0.8)' }
    ]),
  
  // Slide in from right
  slideInRight: (element: HTMLElement) => 
    animateElement(element, [
      { opacity: 0, transform: 'translateX(100%)' },
      { opacity: 1, transform: 'translateX(0)' }
    ]),
  
  // Slide out to right
  slideOutRight: (element: HTMLElement) => 
    animateElement(element, [
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: 'translateX(100%)' }
    ]),
  
  // Bounce in
  bounceIn: (element: HTMLElement) => 
    animateElement(element, [
      { opacity: 0, transform: 'scale(0.3)' },
      { opacity: 1, transform: 'scale(1.05)' },
      { opacity: 1, transform: 'scale(0.9)' },
      { opacity: 1, transform: 'scale(1)' }
    ], {
      duration: ANIMATION_CONFIG.duration.slow,
      easing: ANIMATION_CONFIG.easing.bounce
    }),
  
  // Shake animation for errors
  shake: (element: HTMLElement) => 
    animateElement(element, [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(10px)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(10px)' },
      { transform: 'translateX(0)' }
    ], {
      duration: ANIMATION_CONFIG.duration.slow
    })
};

// React hook for managing component animations
export const useAnimation = (initialState = false) => {
  const [isAnimating, setIsAnimating] = React.useState(initialState);
  
  const startAnimation = React.useCallback((id?: string) => {
    if (id) animationManager.register(id);
    setIsAnimating(true);
  }, []);
  
  const stopAnimation = React.useCallback((id?: string) => {
    if (id) animationManager.unregister(id);
    setIsAnimating(false);
  }, []);
  
  const toggleAnimation = React.useCallback((id?: string) => {
    if (isAnimating) {
      stopAnimation(id);
    } else {
      startAnimation(id);
    }
  }, [isAnimating, startAnimation, stopAnimation]);
  
  return {
    isAnimating,
    startAnimation,
    stopAnimation,
    toggleAnimation
  };
};

// Performance optimization: Reduce motion for users who prefer it
export const respectsReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Get animation duration based on user preferences
export const getAnimationDuration = (
  duration: keyof typeof ANIMATION_CONFIG.duration = 'normal'
): number => {
  if (respectsReducedMotion()) return 0;
  return ANIMATION_CONFIG.duration[duration];
};

// CSS-in-JS animation styles
export const animationStyles = {
  fadeIn: {
    animation: `fadeIn ${ANIMATION_CONFIG.duration.normal}ms ${ANIMATION_CONFIG.easing.easeInOut}`
  },
  
  slideIn: {
    animation: `slideIn ${ANIMATION_CONFIG.duration.normal}ms ${ANIMATION_CONFIG.easing.easeOut}`
  },
  
  bounceIn: {
    animation: `bounceSubtle ${ANIMATION_CONFIG.duration.slow}ms ${ANIMATION_CONFIG.easing.bounce}`
  }
};

// Export React import for the hook
import React from 'react';
