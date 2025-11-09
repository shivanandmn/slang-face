/**
 * Chat-related type definitions for Phase 4 enhanced chat system
 */

export type ChatMessage = {
  id: string; // uuid
  senderId: string;
  senderName?: string;
  text: string;
  ts: number; // epoch ms
  edited?: boolean;
  editedAt?: number;
  replyTo?: string; // message ID this is replying to
};

export type ChatState = {
  messages: ChatMessage[];
  isConnected: boolean;
  isTyping: boolean;
  lastMessageId?: string;
  pendingMessageCount?: number;
  typingUsers?: string[]; // user IDs currently typing
};

export type SendMessageOptions = {
  retry?: boolean;
  timeout?: number;
  priority?: 'low' | 'normal' | 'high';
};

export type MessageValidationResult = {
  isValid: boolean;
  error?: string;
  sanitizedText?: string;
};

export type ChatMetrics = {
  totalMessages: number;
  messagesSent: number;
  messagesReceived: number;
  messagesDelivered: number;
  messagesFailed: number;
  averageDeliveryTime: number;
  connectionUptime: number;
};

export type ChatFilter = {
  senderId?: string;
  startTime?: number;
  endTime?: number;
  textContains?: string;
  limit?: number;
};

export type ChatExport = {
  messages: ChatMessage[];
  exportedAt: number;
  participantCount: number;
  timeRange: {
    start: number;
    end: number;
  };
};
