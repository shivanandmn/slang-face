/**
 * Chat-related type definitions
 */

export type ChatMessage = {
  id: string; // uuid
  senderId: string;
  senderName?: string;
  text: string;
  ts: number; // epoch ms
};

export type ChatState = {
  messages: ChatMessage[];
  isConnected: boolean;
  isTyping: boolean;
  lastMessageId?: string;
};

export type SendMessageOptions = {
  retry?: boolean;
  timeout?: number;
};
