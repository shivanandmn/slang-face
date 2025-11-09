/**
 * ChatPanel - Modern chat interface component with message history,
 * typing indicators, and real-time messaging
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MoreVertical,
  Smile,
  Paperclip
} from 'lucide-react';
import { chatService } from '../services/chatService';
import { logger } from '../utils/logger';
import { LOG_CONFIG, CHAT_CONFIG } from '../config/constants';
import type { ChatMessage, ChatState } from '../types/chat';

export type ChatPanelProps = {
  className?: string;
  currentUserId?: string;
  currentUserName?: string;
  onMessageSent?: (message: ChatMessage) => void;
  onMessageReceived?: (message: ChatMessage) => void;
  showTypingIndicators?: boolean;
  showMessageStatus?: boolean;
  maxHeight?: string;
  placeholder?: string;
};

export type MessageItemProps = {
  message: ChatMessage;
  isOwn: boolean;
  showStatus?: boolean;
  currentUserName?: string;
};

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  isOwn, 
  showStatus = true,
  currentUserName 
}) => {
  const [messageStatus, setMessageStatus] = useState<string>('sent');
  
  useEffect(() => {
    if (isOwn) {
      const status = chatService.getMessageStatus(message.id);
      setMessageStatus(status || 'sent');
    }
  }, [message.id, isOwn]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = () => {
    switch (messageStatus) {
      case 'pending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <CheckCircle className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCircle className="w-3 h-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  const senderName = isOwn 
    ? (currentUserName || 'You') 
    : (message.senderName || `User ${message.senderId.slice(-6)}`);

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender name */}
        <div className={`text-xs text-gray-500 mb-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          {senderName}
        </div>
        
        {/* Message bubble */}
        <div
          className={`
            px-4 py-2 rounded-2xl shadow-sm
            ${isOwn 
              ? 'bg-blue-500 text-white rounded-br-md' 
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
            }
          `}
        >
          <p className="text-sm leading-relaxed break-words">{message.text}</p>
          
          {/* Message footer */}
          <div className={`flex items-center justify-between mt-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
              {formatTime(message.ts)}
            </span>
            
            {/* Status indicator for own messages */}
            {isOwn && showStatus && (
              <div className="ml-2">
                {getStatusIcon()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TypingIndicator: React.FC<{ typingUsers: string[] }> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    } else {
      return `${typingUsers.length} people are typing...`;
    }
  };

  return (
    <div className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-500">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  className = '',
  currentUserId,
  currentUserName,
  onMessageSent,
  onMessageReceived,
  showTypingIndicators = true,
  showMessageStatus = true,
  maxHeight = '400px',
  placeholder = 'Type a message...',
}) => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isConnected: false,
    isTyping: false,
    typingUsers: [],
  });
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!showTypingIndicators) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator
    chatService.sendTypingIndicator(true);

    // Auto-clear after timeout
    typingTimeoutRef.current = setTimeout(() => {
      chatService.sendTypingIndicator(false);
    }, CHAT_CONFIG.TYPING_INDICATOR_TIMEOUT);
  }, [showTypingIndicators]);

  // Send message
  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    // Validate message length
    if (text.length > CHAT_CONFIG.MAX_MESSAGE_LENGTH) {
      logger.warn(LOG_CONFIG.TAGS.CHAT, 'Message too long', { length: text.length });
      return;
    }

    setIsSending(true);
    
    try {
      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Sending message from ChatPanel', { textLength: text.length });
      
      const messageId = await chatService.sendMessage(text);
      
      // Clear input
      setInputText('');
      
      // Clear typing indicator
      chatService.sendTypingIndicator(false);
      
      // Focus input for next message
      inputRef.current?.focus();
      
      logger.debug(LOG_CONFIG.TAGS.CHAT, 'Message sent from ChatPanel', { messageId });
      
    } catch (error) {
      logger.error(LOG_CONFIG.TAGS.CHAT, 'Failed to send message from ChatPanel', { error });
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);
    
    // Trigger typing indicator if user is typing
    if (value.trim() && !chatState.isTyping) {
      handleTyping();
    }
  }, [chatState.isTyping, handleTyping]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Setup chat service event handlers
  useEffect(() => {
    const handleMessageReceived = (message: ChatMessage) => {
      setChatState(prevState => ({
        ...prevState,
        messages: [...prevState.messages, message],
      }));
      
      onMessageReceived?.(message);
      
      // Auto-scroll to new message
      setTimeout(scrollToBottom, 100);
    };

    const handleMessageSent = (message: ChatMessage) => {
      onMessageSent?.(message);
    };

    const handleConnectionStateChanged = (isConnected: boolean) => {
      setChatState(prevState => ({
        ...prevState,
        isConnected,
      }));
    };

    const handleTypingIndicator = (senderId: string, isTyping: boolean) => {
      if (!showTypingIndicators) return;
      
      setTypingUsers(prevUsers => {
        if (isTyping) {
          return prevUsers.includes(senderId) ? prevUsers : [...prevUsers, senderId];
        } else {
          return prevUsers.filter(id => id !== senderId);
        }
      });
    };

    // Set up event handlers
    chatService.setEventHandlers({
      onMessageReceived: handleMessageReceived,
      onMessageSent: handleMessageSent,
      onConnectionStateChanged: handleConnectionStateChanged,
      onTypingIndicator: handleTypingIndicator,
    });

    // Initialize with current state
    setChatState(chatService.getChatState());

    // Cleanup
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [onMessageReceived, onMessageSent, showTypingIndicators, scrollToBottom]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages, scrollToBottom]);

  const connectionStatusColor = chatState.isConnected ? 'text-green-500' : 'text-red-500';
  const connectionStatusText = chatState.isConnected ? 'Connected' : 'Disconnected';

  return (
    <div className={`flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          <h3 className="font-medium text-gray-900">Chat</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${chatState.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={`text-xs ${connectionStatusColor}`}>
            {connectionStatusText}
          </span>
        </div>
      </div>

      {/* Messages area */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{ maxHeight }}
      >
        {chatState.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start a conversation!</p>
          </div>
        ) : (
          <>
            {chatState.messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                isOwn={message.senderId === currentUserId}
                showStatus={showMessageStatus}
                currentUserName={currentUserName}
              />
            ))}
            
            {/* Typing indicator */}
            {showTypingIndicators && (
              <TypingIndicator typingUsers={typingUsers} />
            )}
          </>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={chatState.isConnected ? placeholder : 'Connecting...'}
              disabled={!chatState.isConnected || isSending}
              className="
                w-full px-4 py-2 pr-12 
                border border-gray-300 rounded-full
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:bg-gray-100 disabled:cursor-not-allowed
                text-sm
              "
              maxLength={CHAT_CONFIG.MAX_MESSAGE_LENGTH}
            />
            
            {/* Character counter */}
            {inputText.length > CHAT_CONFIG.MAX_MESSAGE_LENGTH * 0.8 && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                <span className={`text-xs ${
                  inputText.length > CHAT_CONFIG.MAX_MESSAGE_LENGTH 
                    ? 'text-red-500' 
                    : 'text-gray-400'
                }`}>
                  {inputText.length}/{CHAT_CONFIG.MAX_MESSAGE_LENGTH}
                </span>
              </div>
            )}
          </div>
          
          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!inputText.trim() || !chatState.isConnected || isSending}
            className="
              p-2 rounded-full
              bg-blue-500 hover:bg-blue-600 
              disabled:bg-gray-300 disabled:cursor-not-allowed
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            "
            title="Send message"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        
        {/* Status bar */}
        {chatState.pendingMessageCount && chatState.pendingMessageCount > 0 && (
          <div className="mt-2 text-xs text-gray-500 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{chatState.pendingMessageCount} message(s) pending</span>
          </div>
        )}
      </div>
    </div>
  );
};
