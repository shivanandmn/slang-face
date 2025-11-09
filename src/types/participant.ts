/**
 * Participant-related type definitions
 */

export type UIParticipant = {
  id: string;
  name?: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocal?: boolean;
  audioLevel?: number;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'unknown';
};

export type ParticipantState = {
  participants: Map<string, UIParticipant>;
  localParticipant?: UIParticipant;
  activeSpeaker?: string;
};
