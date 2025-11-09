/**
 * Advanced chat service for DataChannel management with message queuing,
 * retry logic, and delivery confirmation
 */

import { v4 as uuidv4 } from 'uuid';
import { livekitService } from './livekitService';
import { logger } from '../utils/logger';
import { ErrorHandler, AppError } from '../utils/errorHandler';
import { LOG_CONFIG, CHAT_CONFIG } from '../config/constants';
import type { ChatMessage, ChatState, SendMessageOptions } from '../types/chat';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export type QueuedMessage = {
  message: ChatMessage;
  status: MessageStatus;
  attempts: number;
  timestamp: number;
  options?: SendMessageOptions;
};

export type ChatServiceEventHandlers = {
  onMessageReceived?: (message: ChatMessage) => void;
  onMessageSent?: (message: ChatMessage) => void;
  onMessageDelivered?: (messageId: string) => void;
  onMessageFailed?: (messageId: string, error: Error) => void;
  onConnectionStateChanged?: (isConnected: boolean) => void;
  onTypingIndicator?: (senderId: string, isTyping: boolean) => void;
  onError?: (error: Error) => void;
};

export type DeliveryReceipt = {
  type: 'delivery_receipt';
  messageId: string;
  timestamp: number;
};

export type TypingIndicator = {
  type: 'typing_indicator';
  senderId: string;
  isTyping: boolean;
  timestamp: number;
};

export type ChatSystemMessage = DeliveryReceipt | TypingIndicator;

export class ChatService {
  private static instance: ChatService;
  private messageQueue: Map<string, QueuedMessage> = new Map();
  private messageHistory: ChatMessage[] = [];
  private eventHandlers: ChatServiceEventHandlers = {};
  private isConnected = false;
  private currentUserId: string | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private typingTimer: NodeJS.Timeout | null = null;
  private isTyping = false;

  private constructor() {
    this.setupLiveKitIntegration();
  }

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Set event handlers for chat events
   */
  setEventHandlers(handlers: ChatServiceEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Initialize chat service with user ID
   */
  initialize(userId: string): void {
    logger.info(LOG_CONFIG.TAGS.CHAT, 'Initializing chat service', { userId });
    this.currentUserId = userId;
  }

  /**
   * Send a chat message with retry logic and queuing
   */
  async sendMessage(text: string, options: SendMessageOptions = {}): Promise<string> {
    const messageId = uuidv4();
    const message: ChatMessage = {
      id: messageId,
      senderId: this.currentUserId || 'unknown',
      text: text.trim(),
      ts: Date.now(),
    };

    logger.debug(LOG_CONFIG.TAGS.CHAT, 'Queuing message for sending', { 
      messageId,
      textLength: text.length 
    });

    // Add to queue
    const queuedMessage: QueuedMessage = {
      message,
      status: 'pending',
      attempts: 0,
      timestamp: Date.now(),
      options,
    };

    this.messageQueue.set(messageId, queuedMessage);

    // Try to send immediately
    await this.processMessageQueue();

    return messageId;
  }

  /**
   * Process message queue and retry failed messages
   */
  private async processMessageQueue(): Promise<void> {
    if (!this.isConnected) {
      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Skipping message queue processing - not connected');
      return;
    }

    const pendingMessages = Array.from(this.messageQueue.values())
      .filter(qm => qm.status === 'pending' || qm.status === 'failed')
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const queuedMessage of pendingMessages) {
      try {
        await this.sendQueuedMessage(queuedMessage);
      } catch (error) {
        logger.error(LOG_CONFIG.TAGS.CHAT, 'Failed to process queued message', {
          messageId: queuedMessage.message.id,
          error
        });
      }
    }
  }

  /**
   * Send a queued message with retry logic
   */
  private async sendQueuedMessage(queuedMessage: QueuedMessage): Promise<void> {
    const { message, options = {} } = queuedMessage;
    const maxAttempts = CHAT_CONFIG.MAX_RETRY_ATTEMPTS;
    const timeout = options.timeout || CHAT_CONFIG.MESSAGE_TIMEOUT;

    queuedMessage.attempts++;

    try {
      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Attempting to send message', {
        messageId: message.id,
        attempt: queuedMessage.attempts,
        maxAttempts
      });

      // Set timeout for the send operation
      const sendPromise = livekitService.sendChatMessage(message);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Message send timeout')), timeout);
      });

      await Promise.race([sendPromise, timeoutPromise]);

      // Mark as sent
      queuedMessage.status = 'sent';
      
      // Add to history
      this.addToHistory(message);
      
      // Notify handlers
      this.eventHandlers.onMessageSent?.(message);

      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Message sent successfully', { 
        messageId: message.id 
      });

      // Schedule delivery confirmation timeout
      this.scheduleDeliveryTimeout(message.id);

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.CHAT, 'Failed to send message', {
        messageId: message.id,
        attempt: queuedMessage.attempts,
        error
      });

      if (queuedMessage.attempts >= maxAttempts) {
        // Mark as permanently failed
        queuedMessage.status = 'failed';
        this.eventHandlers.onMessageFailed?.(message.id, error as Error);
        
        // Remove from queue after max attempts
        setTimeout(() => {
          this.messageQueue.delete(message.id);
        }, CHAT_CONFIG.FAILED_MESSAGE_CLEANUP_DELAY);
      } else {
        // Mark for retry
        queuedMessage.status = 'failed';
        
        // Schedule retry with exponential backoff
        const retryDelay = Math.min(
          CHAT_CONFIG.RETRY_BASE_DELAY * Math.pow(2, queuedMessage.attempts - 1),
          CHAT_CONFIG.MAX_RETRY_DELAY
        );
        
        setTimeout(() => {
          if (this.messageQueue.has(message.id)) {
            this.processMessageQueue();
          }
        }, retryDelay);
      }

      throw error;
    }
  }

  /**
   * Schedule delivery confirmation timeout
   */
  private scheduleDeliveryTimeout(messageId: string): void {
    setTimeout(() => {
      const queuedMessage = this.messageQueue.get(messageId);
      if (queuedMessage && queuedMessage.status === 'sent') {
        // Assume delivered if no explicit confirmation received
        queuedMessage.status = 'delivered';
        this.eventHandlers.onMessageDelivered?.(messageId);
        
        // Clean up after successful delivery
        setTimeout(() => {
          this.messageQueue.delete(messageId);
        }, CHAT_CONFIG.DELIVERED_MESSAGE_CLEANUP_DELAY);
      }
    }, CHAT_CONFIG.DELIVERY_CONFIRMATION_TIMEOUT);
  }

  /**
   * Handle incoming data from DataChannel
   */
  private handleIncomingData(data: Uint8Array): void {
    try {
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(data);
      const parsed = JSON.parse(jsonString);

      // Check if it's a system message
      if (parsed.type) {
        this.handleSystemMessage(parsed as ChatSystemMessage);
        return;
      }

      // Handle regular chat message
      const message = parsed as ChatMessage;
      
      // Validate message structure
      if (!this.isValidChatMessage(message)) {
        logger.warn(LOG_CONFIG.TAGS.CHAT, 'Received invalid chat message', { parsed });
        return;
      }

      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Received chat message', { 
        messageId: message.id,
        senderId: message.senderId 
      });

      // Send delivery receipt if not our own message
      if (message.senderId !== this.currentUserId) {
        this.sendDeliveryReceipt(message.id);
      }

      // Add to history
      this.addToHistory(message);

      // Notify handlers
      this.eventHandlers.onMessageReceived?.(message);

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.CHAT, 'Failed to process incoming data', { error });
    }
  }

  /**
   * Handle system messages (delivery receipts, typing indicators)
   */
  private handleSystemMessage(systemMessage: ChatSystemMessage): void {
    switch (systemMessage.type) {
      case 'delivery_receipt':
        this.handleDeliveryReceipt(systemMessage);
        break;
      case 'typing_indicator':
        this.handleTypingIndicator(systemMessage);
        break;
      default:
        logger.warn(LOG_CONFIG.TAGS.CHAT, 'Unknown system message type', { systemMessage });
    }
  }

  /**
   * Handle delivery receipt
   */
  private handleDeliveryReceipt(receipt: DeliveryReceipt): void {
    const queuedMessage = this.messageQueue.get(receipt.messageId);
    if (queuedMessage && queuedMessage.status === 'sent') {
      queuedMessage.status = 'delivered';
      this.eventHandlers.onMessageDelivered?.(receipt.messageId);
      
      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Message delivery confirmed', { 
        messageId: receipt.messageId 
      });

      // Clean up delivered message
      setTimeout(() => {
        this.messageQueue.delete(receipt.messageId);
      }, CHAT_CONFIG.DELIVERED_MESSAGE_CLEANUP_DELAY);
    }
  }

  /**
   * Handle typing indicator
   */
  private handleTypingIndicator(indicator: TypingIndicator): void {
    if (indicator.senderId !== this.currentUserId) {
      this.eventHandlers.onTypingIndicator?.(indicator.senderId, indicator.isTyping);
      
      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Typing indicator received', {
        senderId: indicator.senderId,
        isTyping: indicator.isTyping
      });
    }
  }

  /**
   * Send delivery receipt for received message
   */
  private async sendDeliveryReceipt(messageId: string): Promise<void> {
    try {
      const receipt: DeliveryReceipt = {
        type: 'delivery_receipt',
        messageId,
        timestamp: Date.now(),
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(receipt));
      
      await livekitService.sendChatMessage({
        id: uuidv4(),
        senderId: this.currentUserId || 'unknown',
        text: JSON.stringify(receipt),
        ts: Date.now(),
      });

      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Delivery receipt sent', { messageId });
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.CHAT, 'Failed to send delivery receipt', { messageId, error });
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(isTyping: boolean): Promise<void> {
    if (this.isTyping === isTyping) return; // No change
    
    this.isTyping = isTyping;

    try {
      const indicator: TypingIndicator = {
        type: 'typing_indicator',
        senderId: this.currentUserId || 'unknown',
        isTyping,
        timestamp: Date.now(),
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(indicator));
      
      await livekitService.sendChatMessage({
        id: uuidv4(),
        senderId: this.currentUserId || 'unknown',
        text: JSON.stringify(indicator),
        ts: Date.now(),
      });

      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Typing indicator sent', { isTyping });

      // Auto-clear typing indicator after timeout
      if (isTyping) {
        if (this.typingTimer) {
          clearTimeout(this.typingTimer);
        }
        
        this.typingTimer = setTimeout(() => {
          this.sendTypingIndicator(false);
        }, CHAT_CONFIG.TYPING_INDICATOR_TIMEOUT);
      }

    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.CHAT, 'Failed to send typing indicator', { isTyping, error });
    }
  }

  /**
   * Validate chat message structure
   */
  private isValidChatMessage(message: any): message is ChatMessage {
    return (
      typeof message === 'object' &&
      typeof message.id === 'string' &&
      typeof message.senderId === 'string' &&
      typeof message.text === 'string' &&
      typeof message.ts === 'number' &&
      message.id.length > 0 &&
      message.senderId.length > 0 &&
      message.text.length > 0 &&
      message.ts > 0
    );
  }

  /**
   * Add message to history with deduplication
   */
  private addToHistory(message: ChatMessage): void {
    // Check for duplicates
    const exists = this.messageHistory.some(msg => msg.id === message.id);
    if (exists) {
      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Ignoring duplicate message in history', { 
        messageId: message.id 
      });
      return;
    }

    // Add to history
    this.messageHistory.push(message);

    // Maintain history limit
    if (this.messageHistory.length > CHAT_CONFIG.MAX_HISTORY_SIZE) {
      const removed = this.messageHistory.splice(0, this.messageHistory.length - CHAT_CONFIG.MAX_HISTORY_SIZE);
      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Trimmed message history', { 
        removedCount: removed.length,
        currentSize: this.messageHistory.length 
      });
    }
  }

  /**
   * Setup integration with LiveKit service
   */
  private setupLiveKitIntegration(): void {
    livekitService.setEventHandlers({
      onConnectionStateChanged: (state) => {
        const wasConnected = this.isConnected;
        this.isConnected = state === 'connected';
        
        if (this.isConnected && !wasConnected) {
          logger.info(LOG_CONFIG.TAGS.CHAT, 'Chat service connected - processing queued messages');
          this.processMessageQueue();
        }
        
        this.eventHandlers.onConnectionStateChanged?.(this.isConnected);
      },
      
      onDataReceived: (data) => {
        this.handleIncomingData(data);
      },
      
      onError: (error) => {
        this.eventHandlers.onError?.(error);
      },
    });
  }

  /**
   * Get current chat state
   */
  getChatState(): ChatState {
    return {
      messages: [...this.messageHistory],
      isConnected: this.isConnected,
      isTyping: this.isTyping,
      lastMessageId: this.messageHistory[this.messageHistory.length - 1]?.id,
    };
  }

  /**
   * Get message by ID
   */
  getMessageById(messageId: string): ChatMessage | undefined {
    return this.messageHistory.find(msg => msg.id === messageId);
  }

  /**
   * Get messages by sender
   */
  getMessagesBySender(senderId: string): ChatMessage[] {
    return this.messageHistory.filter(msg => msg.senderId === senderId);
  }

  /**
   * Get queued message status
   */
  getMessageStatus(messageId: string): MessageStatus | undefined {
    return this.messageQueue.get(messageId)?.status;
  }

  /**
   * Get pending message count
   */
  getPendingMessageCount(): number {
    return Array.from(this.messageQueue.values())
      .filter(qm => qm.status === 'pending' || qm.status === 'failed').length;
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    logger.info(LOG_CONFIG.TAGS.CHAT, 'Clearing chat history', { 
      messageCount: this.messageHistory.length 
    });
    this.messageHistory = [];
  }

  /**
   * Clear message queue
   */
  clearQueue(): void {
    logger.info(LOG_CONFIG.TAGS.CHAT, 'Clearing message queue', { 
      queueSize: this.messageQueue.size 
    });
    this.messageQueue.clear();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    logger.info(LOG_CONFIG.TAGS.CHAT, 'Cleaning up chat service');
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
    
    this.clearQueue();
    this.isConnected = false;
    this.currentUserId = null;
    this.isTyping = false;
  }
}

// Export singleton instance
export const chatService = ChatService.getInstance();
