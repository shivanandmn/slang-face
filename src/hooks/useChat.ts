/**
 * React hook for chat functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/authService';
import { logger } from '../utils/logger';
import { LOG_CONFIG, UI_CONFIG } from '../config/constants';
import type { ChatMessage } from '../types/chat';

export type UseChatReturn = {
  // Messages
  messages: ChatMessage[];
  
  // Actions
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  
  // State
  isTyping: boolean;
  lastMessage: ChatMessage | null;
  messageCount: number;
  
  // Utilities
  getMessageById: (id: string) => ChatMessage | undefined;
  getMessagesByUser: (userId: string) => ChatMessage[];
};

export type UseChatOptions = {
  maxMessages?: number;
  onMessageReceived?: (message: ChatMessage) => void;
  onMessageSent?: (message: ChatMessage) => void;
  enableTypingIndicator?: boolean;
};

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    maxMessages = UI_CONFIG.CHAT_MESSAGE_LIMIT,
    onMessageReceived,
    onMessageSent,
    enableTypingIndicator = true,
  } = options;

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageRef = useRef<ChatMessage | null>(null);

  // Derived state
  const lastMessage = messages[messages.length - 1] || null;
  const messageCount = messages.length;

  // Clear typing indicator
  const clearTypingIndicator = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsTyping(false);
  }, []);

  // Set typing indicator
  const setTypingIndicator = useCallback(() => {
    if (!enableTypingIndicator) return;

    setIsTyping(true);
    clearTypingIndicator();
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, UI_CONFIG.TYPING_INDICATOR_TIMEOUT);
  }, [enableTypingIndicator, clearTypingIndicator]);

  // Add message to list
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prevMessages => {
      // Check for duplicate messages
      const isDuplicate = prevMessages.some(msg => msg.id === message.id);
      if (isDuplicate) {
        logger.debug(LOG_CONFIG.TAGS.CHAT, 'Ignoring duplicate message', { messageId: message.id });
        return prevMessages;
      }

      // Add new message and maintain max limit
      const newMessages = [...prevMessages, message].slice(-maxMessages);
      
      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Added message to chat', { 
        messageId: message.id,
        totalMessages: newMessages.length 
      });

      return newMessages;
    });

    // Update last message ref
    lastMessageRef.current = message;
  }, [maxMessages]);

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      logger.warn(LOG_CONFIG.TAGS.CHAT, 'Attempted to send empty message');
      return;
    }

    logger.debug(LOG_CONFIG.TAGS.CHAT, 'Sending message from chat hook');

    try {
      // Clear typing indicator when sending
      clearTypingIndicator();

      // Send through auth service
      await authService.sendMessage(trimmedText);
      
      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Message sent successfully from chat hook');
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.CHAT, 'Failed to send message from chat hook', { error });
      throw error;
    }
  }, [clearTypingIndicator]);

  // Clear all messages
  const clearMessages = useCallback(() => {
    logger.info(LOG_CONFIG.TAGS.CHAT, 'Clearing all chat messages');
    setMessages([]);
    lastMessageRef.current = null;
    clearTypingIndicator();
  }, [clearTypingIndicator]);

  // Get message by ID
  const getMessageById = useCallback((id: string): ChatMessage | undefined => {
    return messages.find(msg => msg.id === id);
  }, [messages]);

  // Get messages by user
  const getMessagesByUser = useCallback((userId: string): ChatMessage[] => {
    return messages.filter(msg => msg.senderId === userId);
  }, [messages]);

  // Setup message listener
  useEffect(() => {
    const handleChatMessage = (message: ChatMessage) => {
      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Received chat message in hook', { 
        messageId: message.id,
        senderId: message.senderId 
      });

      // Add to messages list
      addMessage(message);

      // Get current session to check if it's our own message
      const currentSession = authService.getCurrentSession();
      const isOwnMessage = currentSession && message.senderId === currentSession.userId;

      if (isOwnMessage) {
        // Our own message (echo/confirmation)
        onMessageSent?.(message);
      } else {
        // Message from another participant
        onMessageReceived?.(message);
        
        // Show typing indicator for incoming messages
        if (enableTypingIndicator) {
          setTypingIndicator();
        }
      }
    };

    // Set up auth service handler
    authService.setEventHandlers({
      onChatMessage: handleChatMessage,
    });

    // Cleanup
    return () => {
      clearTypingIndicator();
    };
  }, [addMessage, onMessageReceived, onMessageSent, enableTypingIndicator, setTypingIndicator, clearTypingIndicator]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTypingIndicator();
    };
  }, [clearTypingIndicator]);

  return {
    // Messages
    messages,
    
    // Actions
    sendMessage,
    clearMessages,
    
    // State
    isTyping,
    lastMessage,
    messageCount,
    
    // Utilities
    getMessageById,
    getMessagesByUser,
  };
}
