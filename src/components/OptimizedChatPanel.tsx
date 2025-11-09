/**
 * Optimized ChatPanel - Performance-enhanced chat interface
 * Features: Virtual scrolling, memoization, debounced input, lazy loading
 */

import React, { 
  useState, 
  useRef, 
  useEffect, 
  useCallback, 
  useMemo,
  memo,
  lazy,
  Suspense
} from 'react';
import { 
  Send, 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { chatService } from '../services/chatService';
import { logger } from '../utils/logger';
import { LOG_CONFIG, CHAT_CONFIG } from '../config/constants';
import type { ChatMessage, ChatState } from '../types/chat';
import { 
  useDebounce, 
  useThrottle, 
  useVirtualScrolling,
  usePerformanceMonitor,
  shallowEqual,
  PERFORMANCE_CONFIG
} from '../utils/performance';
import { getAnimationClasses, getTransitionClasses } from '../utils/animations';
import { useToast } from './Toast';

// Lazy load emoji picker for better initial bundle size
const EmojiPicker = lazy(() => import('./EmojiPicker'));

export type OptimizedChatPanelProps = {
  className?: string;
  currentUserId?: string;
  currentUserName?: string;
  onMessageSent?: (message: ChatMessage) => void;
  onMessageReceived?: (message: ChatMessage) => void;
  showTypingIndicators?: boolean;
  showMessageStatus?: boolean;
  maxHeight?: string;
  placeholder?: string;
  virtualScrolling?: boolean;
  maxMessages?: number;
};

// Memoized message item component
const MessageItem = memo<{
  message: ChatMessage;
  isOwn: boolean;
  showStatus?: boolean;
  currentUserName?: string;
}>(({ message, isOwn, showStatus = true, currentUserName }) => {
  const [messageStatus, setMessageStatus] = useState<string>('sent');
  
  // Memoize status icon to prevent unnecessary re-renders
  const StatusIcon = useMemo(() => {
    switch (messageStatus) {
      case 'pending':
        return <Clock className="w-3 h-3 text-gray-400 animate-pulse" />;
      case 'sent':
        return <CheckCircle className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCircle className="w-3 h-3 text-primary-500" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-error-500" />;
      default:
        return null;
    }
  }, [messageStatus]);
  
  // Memoize timestamp formatting
  const formattedTime = useMemo(() => {
    return new Date(message.ts).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, [message.ts]);
  
  // Memoize message classes
  const messageClasses = useMemo(() => {
    const baseClasses = `
      flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3
      ${getAnimationClasses.slideIn('fast')}
    `;
    return baseClasses;
  }, [isOwn]);
  
  const bubbleClasses = useMemo(() => {
    const baseClasses = `
      max-w-xs lg:max-w-md px-4 py-2 rounded-lg text-sm
      ${getTransitionClasses.all('fast')}
    `;
    
    const typeClasses = isOwn
      ? 'bg-primary-500 text-white rounded-br-sm'
      : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm shadow-sm';
    
    return `${baseClasses} ${typeClasses}`;
  }, [isOwn]);
  
  return (
    <div className={messageClasses}>
      <div className={bubbleClasses}>
        {/* Sender name for non-own messages */}
        {!isOwn && message.senderName && (
          <p className="text-xs font-medium text-gray-600 mb-1">
            {message.senderName}
          </p>
        )}
        
        {/* Message text */}
        <p className="leading-relaxed break-words">
          {message.text}
        </p>
        
        {/* Message metadata */}
        <div className={`
          flex items-center justify-between mt-1 text-xs
          ${isOwn ? 'text-primary-100' : 'text-gray-500'}
        `}>
          <span>{formattedTime}</span>
          {isOwn && showStatus && StatusIcon}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.isOwn === nextProps.isOwn &&
    prevProps.showStatus === nextProps.showStatus &&
    prevProps.currentUserName === nextProps.currentUserName
  );
});

MessageItem.displayName = 'MessageItem';

// Memoized typing indicator component
const TypingIndicator = memo<{ typingUsers: string[] }>(({ typingUsers }) => {
  if (typingUsers.length === 0) return null;
  
  const typingText = useMemo(() => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    } else {
      return `${typingUsers.length} people are typing...`;
    }
  }, [typingUsers]);
  
  return (
    <div className={`
      flex items-center px-4 py-2 text-sm text-gray-500
      ${getAnimationClasses.fadeIn('fast')}
    `}>
      <div className="flex space-x-1 mr-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{typingText}</span>
    </div>
  );
}, shallowEqual);

TypingIndicator.displayName = 'TypingIndicator';

// Main optimized chat panel component
export const OptimizedChatPanel: React.FC<OptimizedChatPanelProps> = memo(({
  className = '',
  currentUserId = '',
  currentUserName = '',
  onMessageSent,
  onMessageReceived,
  showTypingIndicators = true,
  showMessageStatus = true,
  maxHeight = '400px',
  placeholder = 'Type a message...',
  virtualScrolling = true,
  maxMessages = 1000
}) => {
  // Performance monitoring
  const { markRender } = usePerformanceMonitor('OptimizedChatPanel');
  
  // State management with optimized updates
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    typingUsers: [],
    pendingMessages: 0,
    isConnected: false
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Toast notifications
  const { toast } = useToast();
  
  // Memoized filtered and sorted messages
  const displayMessages = useMemo(() => {
    const sortedMessages = [...messages].sort((a, b) => a.ts - b.ts);
    return maxMessages ? sortedMessages.slice(-maxMessages) : sortedMessages;
  }, [messages, maxMessages]);
  
  // Virtual scrolling setup
  const {
    visibleItems: visibleMessages,
    totalHeight,
    offsetY,
    handleScroll
  } = useVirtualScrolling(
    displayMessages,
    60, // Estimated message height
    parseInt(maxHeight) || 400,
    5 // Overscan
  );
  
  // Debounced typing indicator
  const debouncedTyping = useDebounce(
    (isTyping: boolean) => {
      if (chatService.isInitialized()) {
        chatService.sendTypingIndicator(isTyping);
      }
    },
    PERFORMANCE_CONFIG.debounce.input
  );
  
  // Throttled scroll handler
  const throttledScrollToBottom = useThrottle(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, PERFORMANCE_CONFIG.throttle.scroll);
  
  // Memoized message sending function
  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || !chatService.isInitialized()) return;
    
    const messageText = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    
    try {
      markRender('sending-message');
      
      const message: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        senderId: currentUserId,
        senderName: currentUserName,
        text: messageText,
        ts: Date.now()
      };
      
      // Optimistically add message to UI
      setMessages(prev => [...prev, message]);
      
      // Send message through service
      await chatService.sendMessage(messageText);
      
      // Notify parent component
      onMessageSent?.(message);
      
      // Show success toast
      toast.success('Message sent');
      
      // Stop typing indicator
      debouncedTyping(false);
      
    } catch (error) {
      logger.error('[OptimizedChatPanel] Failed to send message', { error });
      toast.error('Failed to send message', 'Please try again');
      
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(msg => msg.text !== messageText));
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, currentUserId, currentUserName, onMessageSent, toast, debouncedTyping, markRender]);
  
  // Optimized input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Send typing indicator
    if (value.trim()) {
      debouncedTyping(true);
    } else {
      debouncedTyping(false);
    }
  }, [debouncedTyping]);
  
  // Memoized key press handler
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);
  
  // Initialize chat service and event listeners
  useEffect(() => {
    if (!chatService.isInitialized()) {
      logger.warn('[OptimizedChatPanel] ChatService not initialized');
      return;
    }
    
    // Set up event listeners
    const handleMessage = (message: ChatMessage) => {
      setMessages(prev => {
        // Prevent duplicate messages
        if (prev.some(msg => msg.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
      onMessageReceived?.(message);
    };
    
    const handleStateChange = (newState: ChatState) => {
      setChatState(newState);
    };
    
    // Subscribe to events
    chatService.onMessage(handleMessage);
    chatService.onStateChange(handleStateChange);
    
    // Cleanup
    return () => {
      chatService.offMessage(handleMessage);
      chatService.offStateChange(handleStateChange);
    };
  }, [onMessageReceived]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!virtualScrolling) {
      throttledScrollToBottom();
    }
  }, [messages.length, virtualScrolling, throttledScrollToBottom]);
  
  // Memoized render functions
  const renderMessages = useMemo(() => {
    const messagesToRender = virtualScrolling ? visibleMessages : displayMessages;
    
    return messagesToRender.map((message) => (
      <MessageItem
        key={message.id}
        message={message}
        isOwn={message.senderId === currentUserId}
        showStatus={showMessageStatus}
        currentUserName={currentUserName}
      />
    ));
  }, [virtualScrolling, visibleMessages, displayMessages, currentUserId, showMessageStatus, currentUserName]);
  
  const containerClasses = useMemo(() => `
    flex flex-col bg-white rounded-lg shadow-sm border border-gray-200
    ${getTransitionClasses.all('normal')} ${className}
  `, [className]);
  
  return (
    <div className={containerClasses} style={{ height: maxHeight }}>
      {/* Chat header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <MessageCircle className="w-5 h-5 text-primary-500 mr-2" />
          <h3 className="font-medium text-gray-900">Chat</h3>
          {chatState.pendingMessages > 0 && (
            <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full">
              {chatState.pendingMessages} pending
            </span>
          )}
        </div>
        
        {/* Connection status */}
        <div className={`
          w-2 h-2 rounded-full
          ${chatState.isConnected ? 'bg-success-500' : 'bg-error-500'}
        `} />
      </div>
      
      {/* Messages container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
        onScroll={virtualScrolling ? handleScroll : undefined}
        style={virtualScrolling ? { height: totalHeight } : undefined}
      >
        {virtualScrolling && (
          <div style={{ height: offsetY }} />
        )}
        
        {renderMessages}
        
        {/* Typing indicators */}
        {showTypingIndicators && (
          <TypingIndicator typingUsers={chatState.typingUsers} />
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={isLoading || !chatState.isConnected}
              className={`
                w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                ${getTransitionClasses.colors('fast')}
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                placeholder-gray-400
              `}
              maxLength={CHAT_CONFIG.MESSAGE_MAX_LENGTH}
            />
            
            {/* Character counter */}
            {inputValue.length > CHAT_CONFIG.MESSAGE_MAX_LENGTH * 0.8 && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                {CHAT_CONFIG.MESSAGE_MAX_LENGTH - inputValue.length}
              </div>
            )}
          </div>
          
          {/* Emoji picker button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`
              p-2 text-gray-400 rounded-md
              ${getTransitionClasses.colors('fast')}
              hover:text-gray-600 hover:bg-gray-100
              focus:outline-none focus:ring-2 focus:ring-primary-500
            `}
            disabled={isLoading}
          >
            😊
          </button>
          
          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading || !chatState.isConnected}
            className={`
              p-2 bg-primary-500 text-white rounded-md
              ${getTransitionClasses.all('fast')}
              hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        {/* Emoji picker */}
        {showEmojiPicker && (
          <Suspense fallback={<div className="text-center py-4">Loading emojis...</div>}>
            <EmojiPicker
              onEmojiSelect={(emoji) => {
                setInputValue(prev => prev + emoji);
                setShowEmojiPicker(false);
                inputRef.current?.focus();
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.currentUserName === nextProps.currentUserName &&
    prevProps.showTypingIndicators === nextProps.showTypingIndicators &&
    prevProps.showMessageStatus === nextProps.showMessageStatus &&
    prevProps.maxHeight === nextProps.maxHeight &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.className === nextProps.className
  );
});

OptimizedChatPanel.displayName = 'OptimizedChatPanel';
