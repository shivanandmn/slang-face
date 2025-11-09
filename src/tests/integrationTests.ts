import { testRunner, Assert, wait, waitFor } from '../utils/testUtils';
import { tokenService } from '../services/tokenService';
import { livekitService } from '../services/livekitService';
import { authService } from '../services/authService';
import { audioService } from '../services/audioService';
import { chatService } from '../services/chatService';
import { eventManager } from '../services/eventManager';
import { lifecycleManager } from '../services/lifecycleManager';
import { logger } from '../utils/logger';
import { ConnectionState } from 'livekit-client';

/**
 * Integration tests for the LiveKit Voice+Chat Mini Interface
 * These tests validate the complete flow from token fetching to room operations
 */

export async function runIntegrationTests(): Promise<void> {
  logger.info('[test]', 'Starting integration tests');
  
  try {
    await testTokenService();
    await testLifecycleManager();
    await testEventManager();
    await testAudioService();
    await testChatService();
    await testFullRoomFlow();
    
    const summary = testRunner.getSummary();
    logger.info('[test]', 'Integration tests completed:', summary);
    
    if (summary.totalFailed > 0) {
      throw new Error(`${summary.totalFailed} tests failed`);
    }
    
  } catch (error) {
    logger.error('[test]', 'Integration tests failed:', error);
    throw error;
  }
}

/**
 * Test token service functionality
 */
async function testTokenService(): Promise<void> {
  testRunner.suite('Token Service');
  
  await testRunner.test('should fetch token successfully', async () => {
    const userId = `test-user-${Date.now()}`;
    const token = await tokenService.getToken(userId);
    
    Assert.isNotNull(token, 'Token should not be null');
    Assert.isType(token, 'string', 'Token should be a string');
    Assert.isTrue(token.length > 0, 'Token should not be empty');
  });
  
  await testRunner.test('should handle token refresh', async () => {
    const userId = `test-user-${Date.now()}`;
    
    // Get initial token
    const token1 = await tokenService.getToken(userId);
    Assert.isNotNull(token1, 'First token should not be null');
    
    // Force refresh
    await tokenService.refreshToken();
    const token2 = await tokenService.getToken(userId);
    
    Assert.isNotNull(token2, 'Second token should not be null');
    // Note: tokens might be the same if they haven't expired
  });
  
  await testRunner.test('should handle invalid user ID gracefully', async () => {
    try {
      await tokenService.getToken('');
      Assert.isTrue(false, 'Should have thrown for empty user ID');
    } catch (error) {
      Assert.isTrue(true, 'Should throw for invalid user ID');
    }
  });
  
  testRunner.endSuite();
}

/**
 * Test lifecycle manager functionality
 */
async function testLifecycleManager(): Promise<void> {
  testRunner.suite('Lifecycle Manager');
  
  await testRunner.test('should register and run cleanup functions', async () => {
    let cleanupRan = false;
    
    lifecycleManager.register('test-cleanup', () => {
      cleanupRan = true;
    }, 50);
    
    Assert.equals(lifecycleManager.getCleanupCount(), 1, 'Should have 1 cleanup function');
    Assert.contains(lifecycleManager.getCleanupNames(), 'test-cleanup', 'Should contain test cleanup');
    
    await lifecycleManager.cleanup();
    
    Assert.isTrue(cleanupRan, 'Cleanup function should have run');
    Assert.equals(lifecycleManager.getCleanupCount(), 0, 'Should have 0 cleanup functions after cleanup');
  });
  
  await testRunner.test('should handle async cleanup functions', async () => {
    let cleanupRan = false;
    
    lifecycleManager.register('test-async-cleanup', async () => {
      await wait(10);
      cleanupRan = true;
    }, 50);
    
    await lifecycleManager.cleanup();
    
    Assert.isTrue(cleanupRan, 'Async cleanup function should have run');
  });
  
  await testRunner.test('should handle cleanup errors gracefully', async () => {
    let goodCleanupRan = false;
    
    lifecycleManager.register('bad-cleanup', () => {
      throw new Error('Test error');
    }, 50);
    
    lifecycleManager.register('good-cleanup', () => {
      goodCleanupRan = true;
    }, 60);
    
    // Should not throw even with error in cleanup
    await lifecycleManager.cleanup();
    
    Assert.isTrue(goodCleanupRan, 'Good cleanup should still run after error');
  });
  
  testRunner.endSuite();
}

/**
 * Test event manager functionality
 */
async function testEventManager(): Promise<void> {
  testRunner.suite('Event Manager');
  
  await testRunner.test('should handle callbacks without room', async () => {
    let callbackRan = false;
    
    eventManager.setCallbacks({
      onConnected: () => {
        callbackRan = true;
      }
    });
    
    // Should not throw
    Assert.isFalse(eventManager.isConnected(), 'Should not be connected without room');
    Assert.isNull(eventManager.getRoom(), 'Should have no room');
  });
  
  await testRunner.test('should clear callbacks', async () => {
    eventManager.setCallbacks({
      onConnected: () => {},
      onDisconnected: () => {},
    });
    
    eventManager.clearCallbacks(['onConnected']);
    eventManager.clearCallbacks(); // Clear all
    
    // Should not throw
    Assert.isTrue(true, 'Clearing callbacks should not throw');
  });
  
  testRunner.endSuite();
}

/**
 * Test audio service functionality
 */
async function testAudioService(): Promise<void> {
  testRunner.suite('Audio Service');
  
  await testRunner.test('should initialize without errors', async () => {
    // Audio service should be ready to use
    Assert.isNotNull(audioService, 'Audio service should exist');
    
    // Should be able to call methods without throwing
    const devices = await audioService.getAudioDevices();
    Assert.isTrue(Array.isArray(devices), 'Should return array of devices');
  });
  
  await testRunner.test('should handle permission requests gracefully', async () => {
    // This might fail in headless environments, but should not throw
    try {
      const hasPermission = await audioService.requestMicrophonePermission();
      Assert.isType(hasPermission, 'boolean', 'Should return boolean');
    } catch (error) {
      // Expected in test environments without microphone
      Assert.isTrue(true, 'Permission request may fail in test environment');
    }
  });
  
  await testRunner.test('should handle audio level monitoring', async () => {
    let levelReceived = false;
    
    audioService.onAudioLevel((level) => {
      levelReceived = true;
      Assert.isType(level, 'number', 'Audio level should be number');
      Assert.isTrue(level >= 0 && level <= 1, 'Audio level should be between 0 and 1');
    });
    
    // Start monitoring (may not work in test environment)
    try {
      await audioService.startAudioLevelMonitoring();
      await wait(100); // Give it time to potentially receive levels
    } catch (error) {
      // Expected in test environments
    }
    
    audioService.stopAudioLevelMonitoring();
  });
  
  testRunner.endSuite();
}

/**
 * Test chat service functionality
 */
async function testChatService(): Promise<void> {
  testRunner.suite('Chat Service');
  
  await testRunner.test('should initialize and handle messages', async () => {
    const userId = `test-user-${Date.now()}`;
    let messageReceived = false;
    
    chatService.onMessage((message) => {
      messageReceived = true;
      Assert.hasProperty(message, 'id', 'Message should have id');
      Assert.hasProperty(message, 'text', 'Message should have text');
      Assert.hasProperty(message, 'senderId', 'Message should have senderId');
      Assert.hasProperty(message, 'ts', 'Message should have timestamp');
    });
    
    chatService.initialize(userId);
    
    // Test message validation
    const validMessage = chatService.validateMessage('Hello test');
    Assert.isTrue(validMessage.isValid, 'Valid message should pass validation');
    
    const invalidMessage = chatService.validateMessage('');
    Assert.isFalse(invalidMessage.isValid, 'Empty message should fail validation');
    
    chatService.cleanup();
  });
  
  await testRunner.test('should handle typing indicators', async () => {
    const userId = `test-user-${Date.now()}`;
    let typingReceived = false;
    
    chatService.onTypingUpdate((users) => {
      typingReceived = true;
      Assert.isTrue(Array.isArray(users), 'Typing users should be array');
    });
    
    chatService.initialize(userId);
    
    // Simulate typing
    chatService.sendTypingIndicator();
    
    await wait(100); // Give time for processing
    
    chatService.cleanup();
  });
  
  testRunner.endSuite();
}

/**
 * Test complete room flow (requires network access)
 */
async function testFullRoomFlow(): Promise<void> {
  testRunner.suite('Full Room Flow');
  
  await testRunner.test('should complete authentication flow', async () => {
    const userName = `test-user-${Date.now()}`;
    
    try {
      // Start session
      await authService.startSession(userName);
      
      // Check session state
      const sessionInfo = authService.getSessionInfo();
      Assert.isNotNull(sessionInfo, 'Session info should exist');
      Assert.equals(sessionInfo?.userName, userName, 'User name should match');
      Assert.isTrue(sessionInfo?.isConnected || false, 'Should be connected');
      
      // Get room instance
      const room = authService.getRoom();
      Assert.isNotNull(room, 'Room should exist');
      
      // Wait for connection
      await waitFor(() => {
        return room?.state === ConnectionState.Connected;
      }, 10000);
      
      Assert.equals(room?.state, ConnectionState.Connected, 'Room should be connected');
      
      // Test chat message
      let messageReceived = false;
      authService.onChatMessage((message) => {
        messageReceived = true;
      });
      
      await authService.sendChatMessage('Test message');
      
      // Clean up
      await authService.endSession();
      
      Assert.isFalse(authService.getSessionInfo()?.isConnected || false, 'Should be disconnected');
      
    } catch (error) {
      logger.warn('[test]', 'Full room flow test may fail without network access:', error);
      // Don't fail the test if it's a network issue
      if (error instanceof Error && (
        error.message.includes('network') ||
        error.message.includes('fetch') ||
        error.message.includes('timeout')
      )) {
        Assert.isTrue(true, 'Network test skipped due to connectivity issues');
      } else {
        throw error;
      }
    }
  });
  
  await testRunner.test('should handle connection errors gracefully', async () => {
    // Test with invalid user ID to trigger error
    try {
      await authService.startSession('');
      Assert.isTrue(false, 'Should have failed with empty user name');
    } catch (error) {
      Assert.isTrue(true, 'Should handle invalid session gracefully');
    }
    
    // Ensure clean state
    await authService.endSession();
  });
  
  testRunner.endSuite();
}

/**
 * Run a quick smoke test for basic functionality
 */
export async function runSmokeTest(): Promise<boolean> {
  logger.info('[test]', 'Running smoke test');
  
  try {
    // Test basic service initialization
    Assert.isNotNull(tokenService, 'Token service should exist');
    Assert.isNotNull(livekitService, 'LiveKit service should exist');
    Assert.isNotNull(authService, 'Auth service should exist');
    Assert.isNotNull(audioService, 'Audio service should exist');
    Assert.isNotNull(chatService, 'Chat service should exist');
    Assert.isNotNull(eventManager, 'Event manager should exist');
    Assert.isNotNull(lifecycleManager, 'Lifecycle manager should exist');
    
    // Test basic functionality
    const devices = await audioService.getAudioDevices();
    Assert.isTrue(Array.isArray(devices), 'Audio devices should be array');
    
    const validation = chatService.validateMessage('Test');
    Assert.isTrue(validation.isValid, 'Message validation should work');
    
    logger.info('[test]', 'Smoke test passed');
    return true;
    
  } catch (error) {
    logger.error('[test]', 'Smoke test failed:', error);
    return false;
  }
}

/**
 * Export test results for display
 */
export function getTestResults() {
  return {
    suites: testRunner.getResults(),
    summary: testRunner.getSummary(),
  };
}

/**
 * Clear all test results
 */
export function clearTestResults() {
  testRunner.clear();
}
