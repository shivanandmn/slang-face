import { logger } from '../utils/logger';

export interface CleanupFunction {
  name: string;
  cleanup: () => void | Promise<void>;
  priority: number; // Lower numbers run first
}

export class LifecycleManager {
  private cleanupFunctions: CleanupFunction[] = [];
  private isCleaningUp = false;
  private cleanupPromise: Promise<void> | null = null;
  
  constructor() {
    // Register global cleanup handlers
    this.registerGlobalHandlers();
    logger.info('[lifecycle]', 'LifecycleManager initialized');
  }
  
  /**
   * Register a cleanup function
   */
  register(name: string, cleanup: () => void | Promise<void>, priority: number = 100) {
    if (this.isCleaningUp) {
      logger.warn('[lifecycle]', 'Cannot register cleanup function during cleanup:', name);
      return;
    }
    
    // Remove existing function with same name
    this.unregister(name);
    
    this.cleanupFunctions.push({ name, cleanup, priority });
    this.cleanupFunctions.sort((a, b) => a.priority - b.priority);
    
    logger.debug('[lifecycle]', 'Registered cleanup function:', name, 'priority:', priority);
  }
  
  /**
   * Unregister a cleanup function
   */
  unregister(name: string) {
    const index = this.cleanupFunctions.findIndex(fn => fn.name === name);
    if (index >= 0) {
      this.cleanupFunctions.splice(index, 1);
      logger.debug('[lifecycle]', 'Unregistered cleanup function:', name);
    }
  }
  
  /**
   * Run all cleanup functions
   */
  async cleanup(): Promise<void> {
    if (this.isCleaningUp) {
      logger.debug('[lifecycle]', 'Cleanup already in progress, waiting for completion');
      return this.cleanupPromise || Promise.resolve();
    }
    
    this.isCleaningUp = true;
    logger.info('[lifecycle]', 'Starting cleanup of', this.cleanupFunctions.length, 'functions');
    
    this.cleanupPromise = this.runCleanup();
    await this.cleanupPromise;
    
    this.isCleaningUp = false;
    this.cleanupPromise = null;
  }
  
  /**
   * Internal cleanup runner
   */
  private async runCleanup(): Promise<void> {
    const errors: Array<{ name: string; error: any }> = [];
    
    for (const { name, cleanup } of this.cleanupFunctions) {
      try {
        logger.debug('[lifecycle]', 'Running cleanup:', name);
        const result = cleanup();
        
        // Handle both sync and async cleanup functions
        if (result instanceof Promise) {
          await result;
        }
        
        logger.debug('[lifecycle]', 'Cleanup completed:', name);
      } catch (error) {
        logger.error('[lifecycle]', 'Cleanup error for', name, ':', error);
        errors.push({ name, error });
      }
    }
    
    // Clear all cleanup functions after running them
    this.cleanupFunctions = [];
    
    if (errors.length > 0) {
      logger.warn('[lifecycle]', 'Cleanup completed with', errors.length, 'errors');
      // Don't throw, just log the errors to avoid breaking the cleanup process
    } else {
      logger.info('[lifecycle]', 'All cleanup functions completed successfully');
    }
  }
  
  /**
   * Register global cleanup handlers for browser events
   */
  private registerGlobalHandlers() {
    // Handle page unload
    const handleBeforeUnload = () => {
      logger.info('[lifecycle]', 'Page unloading, running cleanup');
      // Run sync cleanup only (can't await in beforeunload)
      this.runSyncCleanup();
    };
    
    // Handle page visibility change (mobile browsers)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        logger.info('[lifecycle]', 'Page hidden, running cleanup');
        this.cleanup().catch(error => {
          logger.error('[lifecycle]', 'Cleanup error on visibility change:', error);
        });
      }
    };
    
    // Register event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Register cleanup for these listeners
    this.register('global-handlers', () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, 1000); // Low priority, run last
  }
  
  /**
   * Run only synchronous cleanup functions (for beforeunload)
   */
  private runSyncCleanup() {
    for (const { name, cleanup } of this.cleanupFunctions) {
      try {
        const result = cleanup();
        
        // Only run if it's not a promise (sync function)
        if (!(result instanceof Promise)) {
          logger.debug('[lifecycle]', 'Sync cleanup completed:', name);
        }
      } catch (error) {
        logger.error('[lifecycle]', 'Sync cleanup error for', name, ':', error);
      }
    }
  }
  
  /**
   * Get the number of registered cleanup functions
   */
  getCleanupCount(): number {
    return this.cleanupFunctions.length;
  }
  
  /**
   * Get list of registered cleanup function names
   */
  getCleanupNames(): string[] {
    return this.cleanupFunctions.map(fn => fn.name);
  }
  
  /**
   * Check if cleanup is in progress
   */
  isCleanupInProgress(): boolean {
    return this.isCleaningUp;
  }
}

// Singleton instance
export const lifecycleManager = new LifecycleManager();

// Convenience functions for common cleanup patterns
export const registerCleanup = (name: string, cleanup: () => void | Promise<void>, priority?: number) => {
  lifecycleManager.register(name, cleanup, priority);
};

export const unregisterCleanup = (name: string) => {
  lifecycleManager.unregister(name);
};

export const runCleanup = () => {
  return lifecycleManager.cleanup();
};
