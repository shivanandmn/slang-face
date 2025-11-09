/**
 * API-related type definitions
 */

export type TokenRequest = {
  provider?: string;
  voice_id?: string;
  user_id?: string;
};

export type TokenResponse = {
  token: string;
  url?: string;
  expires_at?: number;
};

export type ApiError = {
  message: string;
  code?: string | number;
  details?: unknown;
};

export type ConnectionState = 
  | 'disconnected'
  | 'connecting' 
  | 'connected'
  | 'reconnecting'
  | 'failed';

export type AudioState = {
  isMuted: boolean;
  isPublishing: boolean;
  hasPermission: boolean;
  audioLevel: number;
  device?: MediaDeviceInfo;
};
