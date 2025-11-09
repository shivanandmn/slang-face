/**
 * Performance Optimization Utilities
 * Tools for improving React app performance and monitoring
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';

// Performance monitoring configuration
export const PERFORMANCE_CONFIG = {
  // Debounce delays
  debounce: {
    search: 300,
    resize: 150,
    scroll: 100,
    input: 200
  },
  
  // Throttle intervals
  throttle: {
    scroll: 16, // ~60fps
    resize: 16,
    mousemove: 16,
    animation: 16
  },
  
  // Memory thresholds
  memory: {
    warningThreshold: 50 * 1024 * 1024, // 50MB
    criticalThreshold: 100 * 1024 * 1024 // 100MB
  }
} as const;

// Debounce hook for performance optimization
export const useDebounce = <T extends any[]>(
  callback: (...args: T) => void,
  delay: number,
  deps: React.DependencyList = []
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const debouncedCallback = useCallback(
    (...args: T) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, ...deps]
  );
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return debouncedCallback;
};

// Throttle hook for performance optimization
export const useThrottle = <T extends any[]>(
  callback: (...args: T) => void,
  interval: number,
  deps: React.DependencyList = []
) => {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const throttledCallback = useCallback(
    (...args: T) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;
      
      if (timeSinceLastCall >= interval) {
        lastCallRef.current = now;
        callback(...args);
      } else {
        // Schedule the call for the remaining time
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, interval - timeSinceLastCall);
      }
    },
    [callback, interval, ...deps]
  );
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return throttledCallback;
};

// Memoization utilities
export const createMemoizedSelector = <T, R>(
  selector: (state: T) => R,
  equalityFn?: (a: R, b: R) => boolean
) => {
  let lastState: T;
  let lastResult: R;
  
  return (state: T): R => {
    if (state !== lastState) {
      const newResult = selector(state);
      
      if (equalityFn && lastResult !== undefined) {
        if (!equalityFn(lastResult, newResult)) {
          lastResult = newResult;
        }
      } else {
        lastResult = newResult;
      }
      
      lastState = state;
    }
    
    return lastResult;
  };
};

// Shallow equality comparison for objects
export const shallowEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  
  if (typeof obj1 !== 'object' || obj1 === null || 
      typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef<number>();
  
  // Track render count
  renderCountRef.current += 1;
  
  // Track mount time
  useEffect(() => {
    mountTimeRef.current = performance.now();
    
    return () => {
      const unmountTime = performance.now();
      const lifespan = unmountTime - (mountTimeRef.current || 0);
      
      console.log(`[Performance] ${componentName}:`, {
        renderCount: renderCountRef.current,
        lifespan: `${lifespan.toFixed(2)}ms`
      });
    };
  }, [componentName]);
  
  // Memory usage monitoring (if available)
  useEffect(() => {
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      
      if (memoryInfo.usedJSHeapSize > PERFORMANCE_CONFIG.memory.warningThreshold) {
        console.warn(`[Performance] High memory usage in ${componentName}:`, {
          used: `${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
          total: `${(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`
        });
      }
    }
  }, [componentName]);
  
  return {
    renderCount: renderCountRef.current,
    markRender: (phase: string) => {
      console.log(`[Performance] ${componentName} ${phase}:`, {
        renderCount: renderCountRef.current,
        timestamp: performance.now()
      });
    }
  };
};

// Lazy loading utilities
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  const LazyComponent = React.lazy(importFn);
  
  return (props: React.ComponentProps<T>) => (
    <React.Suspense fallback={fallback ? <fallback /> : <div>Loading...</div>}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
};

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);
  const targetRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        setIsIntersecting(isIntersecting);
        
        if (isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );
    
    observer.observe(target);
    
    return () => observer.disconnect();
  }, [hasIntersected, options]);
  
  return { targetRef, isIntersecting, hasIntersected };
};

// Virtual scrolling utilities
export const useVirtualScrolling = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );
    
    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);
  
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;
  
  const handleScroll = useThrottle((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, PERFORMANCE_CONFIG.throttle.scroll);
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange
  };
};

// Bundle size optimization utilities
export const preloadRoute = (routeComponent: () => Promise<any>) => {
  // Preload on hover or focus for better UX
  const preload = () => {
    routeComponent().catch(() => {
      // Ignore preload errors
    });
  };
  
  return {
    onMouseEnter: preload,
    onFocus: preload
  };
};

// Resource cleanup utilities
export const useCleanup = (cleanupFn: () => void, deps: React.DependencyList = []) => {
  useEffect(() => {
    return cleanupFn;
  }, deps);
};

// Optimized state updates
export const useOptimizedState = <T>(
  initialState: T,
  equalityFn: (a: T, b: T) => boolean = Object.is
) => {
  const [state, setState] = React.useState(initialState);
  
  const setOptimizedState = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prevState => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prevState)
        : newState;
      
      return equalityFn(prevState, nextState) ? prevState : nextState;
    });
  }, [equalityFn]);
  
  return [state, setOptimizedState] as const;
};

// Performance measurement utilities
export const measurePerformance = <T extends any[], R>(
  fn: (...args: T) => R,
  name: string
) => {
  return (...args: T): R => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
    
    return result;
  };
};

// Async performance measurement
export const measureAsyncPerformance = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  name: string
) => {
  return async (...args: T): Promise<R> => {
    const start = performance.now();
    const result = await fn(...args);
    const end = performance.now();
    
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
    
    return result;
  };
};

// Component performance wrapper
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  const WrappedComponent = React.memo((props: P) => {
    const name = componentName || Component.displayName || Component.name || 'Component';
    const { markRender } = usePerformanceMonitor(name);
    
    useEffect(() => {
      markRender('mounted');
    }, [markRender]);
    
    return <Component {...props} />;
  });
  
  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Bundle analyzer helper (development only)
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    console.group('📦 Bundle Analysis');
    
    // Estimate component sizes
    const components = document.querySelectorAll('[data-component]');
    components.forEach(component => {
      const name = component.getAttribute('data-component');
      const size = component.innerHTML.length;
      console.log(`${name}: ~${(size / 1024).toFixed(2)}KB`);
    });
    
    console.groupEnd();
  }
};
