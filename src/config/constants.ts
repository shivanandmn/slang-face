/**
 * Application Constants and Configuration
 */

// API Endpoints
export const API_ENDPOINTS = {
  TOKEN_URL: 'https://us-central1-openlabel-lab-firebase.cloudfunctions.net/slang-session-connect',
  LIVEKIT_URL: 'wss://thinkloud-9x8bbl7h.livekit.cloud',
} as const;

// LiveKit Configuration
export const LIVEKIT_CONFIG = {
  DEFAULT_PROVIDER: 'elevenlabs',
  DEFAULT_VOICE_ID: 'EXAVITQu4vr4xnSDxMaL',
  ROOM_OPTIONS: {
    adaptiveStream: true,
    dynacast: true,
    publishDefaults: {
      audioPreset: {
        maxBitrate: 20_000,
      },
    },
  },
} as const;

// Application Settings
export const APP_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BASE_DELAY: 1000, // ms
  CONNECTION_TIMEOUT: 10000, // ms
  TOKEN_REFRESH_BUFFER: 60000, // ms - refresh token 1 minute before expiry
} as const;

// UI Constants
export const UI_CONFIG = {
  CHAT_MESSAGE_LIMIT: 100,
  TYPING_INDICATOR_TIMEOUT: 3000, // ms
  AUDIO_LEVEL_UPDATE_INTERVAL: 100, // ms
} as const;

// Logging Configuration
export const LOG_CONFIG = {
  LEVELS: ['debug', 'info', 'warn', 'error'] as const,
  TAGS: {
    AUTH: 'auth',
    RTC: 'rtc', 
    CHAT: 'chat',
    UI: 'ui',
    AUDIO: 'audio',
  } as const,
  PII_MASK_LENGTH: 8,
} as const;

// Environment Variables (with defaults)
export const ENV = {
  NODE_ENV: import.meta.env.NODE_ENV || 'development',
  VITE_LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || API_ENDPOINTS.TOKEN_URL,
  VITE_LIVEKIT_URL: import.meta.env.VITE_LIVEKIT_URL || API_ENDPOINTS.LIVEKIT_URL,
} as const;

// Type definitions for constants
export type LogLevel = typeof LOG_CONFIG.LEVELS[number];
export type LogTag = typeof LOG_CONFIG.TAGS[keyof typeof LOG_CONFIG.TAGS];
