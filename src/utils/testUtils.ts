import { logger } from './logger';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: any;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

export class TestRunner {
  private suites: TestSuite[] = [];
  private currentSuite: TestSuite | null = null;
  
  /**
   * Start a new test suite
   */
  suite(name: string): void {
    this.currentSuite = {
      name,
      tests: [],
      passed: 0,
      failed: 0,
      duration: 0,
    };
    logger.info('[test]', 'Starting test suite:', name);
  }
  
  /**
   * Run a test function
   */
  async test(name: string, testFn: () => Promise<void> | void): Promise<TestResult> {
    if (!this.currentSuite) {
      throw new Error('No test suite started. Call suite() first.');
    }
    
    const startTime = Date.now();
    let result: TestResult;
    
    try {
      logger.debug('[test]', 'Running test:', name);
      await testFn();
      
      result = {
        name,
        passed: true,
        duration: Date.now() - startTime,
      };
      
      this.currentSuite.passed++;
      logger.info('[test]', '✅', name, `(${result.duration}ms)`);
      
    } catch (error) {
      result = {
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
      
      this.currentSuite.failed++;
      logger.error('[test]', '❌', name, `(${result.duration}ms):`, result.error);
    }
    
    this.currentSuite.tests.push(result);
    return result;
  }
  
  /**
   * Finish the current test suite
   */
  endSuite(): TestSuite {
    if (!this.currentSuite) {
      throw new Error('No test suite to end');
    }
    
    this.currentSuite.duration = this.currentSuite.tests.reduce((sum, test) => sum + test.duration, 0);
    this.suites.push(this.currentSuite);
    
    const suite = this.currentSuite;
    logger.info('[test]', `Test suite "${suite.name}" completed:`, 
      `${suite.passed} passed, ${suite.failed} failed (${suite.duration}ms)`);
    
    this.currentSuite = null;
    return suite;
  }
  
  /**
   * Get all test results
   */
  getResults(): TestSuite[] {
    return [...this.suites];
  }
  
  /**
   * Get summary of all tests
   */
  getSummary() {
    const totalTests = this.suites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalPassed = this.suites.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = this.suites.reduce((sum, suite) => sum + suite.failed, 0);
    const totalDuration = this.suites.reduce((sum, suite) => sum + suite.duration, 0);
    
    return {
      suites: this.suites.length,
      totalTests,
      totalPassed,
      totalFailed,
      totalDuration,
      passRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0,
    };
  }
  
  /**
   * Clear all results
   */
  clear(): void {
    this.suites = [];
    this.currentSuite = null;
  }
}

// Test assertion utilities
export class Assert {
  static isTrue(condition: boolean, message?: string): void {
    if (!condition) {
      throw new Error(message || 'Expected condition to be true');
    }
  }
  
  static isFalse(condition: boolean, message?: string): void {
    if (condition) {
      throw new Error(message || 'Expected condition to be false');
    }
  }
  
  static equals<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }
  
  static notEquals<T>(actual: T, expected: T, message?: string): void {
    if (actual === expected) {
      throw new Error(message || `Expected values to be different, both are ${actual}`);
    }
  }
  
  static isNull(value: any, message?: string): void {
    if (value !== null) {
      throw new Error(message || `Expected null, got ${value}`);
    }
  }
  
  static isNotNull(value: any, message?: string): void {
    if (value === null) {
      throw new Error(message || 'Expected non-null value');
    }
  }
  
  static isUndefined(value: any, message?: string): void {
    if (value !== undefined) {
      throw new Error(message || `Expected undefined, got ${value}`);
    }
  }
  
  static isNotUndefined(value: any, message?: string): void {
    if (value === undefined) {
      throw new Error(message || 'Expected defined value');
    }
  }
  
  static throws(fn: () => void, message?: string): void {
    try {
      fn();
      throw new Error(message || 'Expected function to throw');
    } catch (error) {
      // Expected to throw
    }
  }
  
  static async throwsAsync(fn: () => Promise<void>, message?: string): Promise<void> {
    try {
      await fn();
      throw new Error(message || 'Expected async function to throw');
    } catch (error) {
      // Expected to throw
    }
  }
  
  static contains<T>(array: T[], item: T, message?: string): void {
    if (!array.includes(item)) {
      throw new Error(message || `Expected array to contain ${item}`);
    }
  }
  
  static hasProperty(obj: any, property: string, message?: string): void {
    if (!(property in obj)) {
      throw new Error(message || `Expected object to have property ${property}`);
    }
  }
  
  static isType(value: any, type: string, message?: string): void {
    if (typeof value !== type) {
      throw new Error(message || `Expected type ${type}, got ${typeof value}`);
    }
  }
  
  static isInstanceOf(value: any, constructor: any, message?: string): void {
    if (!(value instanceof constructor)) {
      throw new Error(message || `Expected instance of ${constructor.name}`);
    }
  }
}

// Utility functions for testing
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await wait(interval);
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
};

export const mockFunction = <T extends (...args: any[]) => any>(
  originalFn?: T
): T & { calls: Parameters<T>[]; results: ReturnType<T>[]; reset: () => void } => {
  const calls: Parameters<T>[] = [];
  const results: ReturnType<T>[] = [];
  
  const mockFn = ((...args: Parameters<T>) => {
    calls.push(args);
    
    if (originalFn) {
      const result = originalFn(...args);
      results.push(result);
      return result;
    }
    
    return undefined;
  }) as T & { calls: Parameters<T>[]; results: ReturnType<T>[]; reset: () => void };
  
  mockFn.calls = calls;
  mockFn.results = results;
  mockFn.reset = () => {
    calls.length = 0;
    results.length = 0;
  };
  
  return mockFn;
};

// Singleton test runner
export const testRunner = new TestRunner();
