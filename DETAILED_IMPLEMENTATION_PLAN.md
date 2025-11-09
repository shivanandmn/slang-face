# LiveKit Voice+Chat Mini Interface - Detailed Implementation Plan

## Project Overview
Building a lightweight web interface for real-time voice and text chat using LiveKit, featuring a single participant talking to a server backend agent.

## Architecture Summary
- **Frontend**: React + TypeScript + Vite
- **Styling**: TailwindCSS + Lucide Icons
- **Real-time**: LiveKit WebRTC + DataChannel
- **Authentication**: Token-based via existing backend
- **Deployment**: Vercel

## Phase 1: Project Foundation

### 1.1 Project Setup
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install core dependencies:
  - `livekit-client` - LiveKit WebRTC client
  - `@livekit/components-react` - React components
  - `tailwindcss` - Styling
  - `lucide-react` - Icons
  - `uuid` - ID generation
  - `@types/uuid` - TypeScript types
- [ ] Configure TypeScript with strict mode
- [ ] Set up TailwindCSS with modern configuration
- [ ] Create basic project structure

### 1.2 Configuration & Constants
- [ ] Create `src/config/constants.ts` with:
  - TOKEN_URL: `https://us-central1-openlabel-lab-firebase.cloudfunctions.net/slang-session-connect`
  - LIVEKIT_URL: `wss://thinkloud-9x8bbl7h.livekit.cloud`
  - Default provider: `elevenlabs`
  - Default voice_id: `EXAVITQu4vr4xnSDxMaL`
- [ ] Create environment configuration system
- [ ] Set up logging configuration with levels and tags

### 1.3 Documentation
- [ ] Create comprehensive README.md
- [ ] Create miscellaneous.md for technical notes
- [ ] Document API contracts and data models
- [ ] Set up development workflow documentation

## Phase 2: Core Authentication & Connection

### 2.1 Token Management
- [ ] Create `src/services/tokenService.ts`:
  - Implement token fetching with proper headers
  - Handle X-User-Id header requirement
  - Implement exponential backoff retry logic
  - Error handling for 401/403 responses
- [ ] Create token response type definitions
- [ ] Implement token validation and expiry handling

### 2.2 LiveKit Connection Service
- [ ] Create `src/services/livekitService.ts`:
  - Room connection management
  - Connection state handling
  - Reconnection logic with backoff
  - Event handling setup
- [ ] Implement connection retry strategy
- [ ] Create connection state management

### 2.3 Error Handling & Logging
- [ ] Create `src/utils/logger.ts`:
  - Structured logging with tags [auth], [rtc], [chat], [ui]
  - Log level management (info, warn, error)
  - PII redaction (JWT masking, participant ID truncation)
- [ ] Create `src/utils/errorHandler.ts`:
  - Centralized error handling
  - User-friendly error messages
  - Toast notification system

## Phase 3: Audio Implementation

### 3.1 Audio Capture & Publishing
- [ ] Create `src/services/audioService.ts`:
  - Microphone permission handling
  - Audio track creation and publishing
  - Microphone toggle functionality
  - Audio level monitoring
- [ ] Implement VAD (Voice Activity Detection)
- [ ] Create audio visualization components

### 3.2 Audio Playback & Management
- [ ] Implement remote audio subscription
- [ ] Audio track management (mute/unmute)
- [ ] Speaking indicator logic
- [ ] Audio quality monitoring

### 3.3 Audio Controls Component
- [ ] Create `src/components/AudioControls.tsx`:
  - Mute/unmute button with visual feedback
  - Microphone level meter
  - Permission status indicator
  - Audio device selection (future enhancement)

## Phase 4: Chat System Implementation

### 4.1 DataChannel Management
- [ ] Create `src/services/chatService.ts`:
  - DataChannel initialization and management
  - Message sending with retry logic
  - Message receiving and parsing
  - Connection state monitoring
- [ ] Implement message queuing for offline scenarios
- [ ] Create message delivery confirmation system

### 4.2 Chat Data Models
- [ ] Implement ChatMessage type:
  ```typescript
  export type ChatMessage = {
    id: string; // uuid
    senderId: string;
    senderName?: string;
    text: string;
    ts: number; // epoch ms
  };
  ```
- [ ] Create message validation and sanitization
- [ ] Implement message history management

### 4.3 Chat UI Components
- [ ] Create `src/components/ChatPanel.tsx`:
  - Message list with timestamps
  - Message input with send button
  - Typing indicators
  - Message status indicators
- [ ] Implement auto-scroll and message pagination
- [ ] Add emoji support and text formatting

## Phase 5: UI Components & Layout

### 5.1 Core Components
- [ ] Create `src/components/JoinForm.tsx`:
  - User name input (optional)
  - Room join button
  - Loading states
  - Error display
- [ ] Create `src/components/RoomView.tsx`:
  - Main room container
  - Connection status display
  - Leave room functionality

### 5.2 Participant Management
- [ ] Create `src/components/ParticipantsList.tsx`:
  - Participant display with avatars
  - Speaking indicators
  - Mute status display
  - Active speaker highlighting
- [ ] Implement UIParticipant type:
  ```typescript
  export type UIParticipant = {
    id: string;
    name?: string;
    isSpeaking: boolean;
    isMuted: boolean;
  };
  ```

### 5.3 Layout & Navigation
- [ ] Create responsive 2-pane layout:
  - Left: Participants & audio controls
  - Right: Chat panel
- [ ] Implement mobile-responsive design
- [ ] Add accessibility features (ARIA labels, keyboard navigation)
- [ ] Create loading and empty states

## Phase 6: State Management & Integration

### 6.1 Application State
- [ ] Create `src/hooks/useRoom.ts`:
  - Room connection state management
  - Participant state tracking
  - Audio state management
  - Chat state management
- [ ] Implement React Context for global state
- [ ] Create custom hooks for feature-specific state

### 6.2 Event Handling
- [ ] Implement comprehensive event handling:
  - Room events (connected, disconnected, reconnecting)
  - Participant events (joined, left, speaking)
  - Track events (published, subscribed, muted)
  - DataChannel events (open, close, message)
- [ ] Create event-driven UI updates
- [ ] Implement proper cleanup on unmount

### 6.3 Integration Testing
- [ ] Test token fetching and room joining
- [ ] Test audio publishing and subscription
- [ ] Test chat message sending and receiving
- [ ] Test reconnection scenarios

## Phase 7: Polish & Optimization

### 7.1 UI/UX Enhancements
- [ ] Implement modern design with TailwindCSS:
  - Clean, minimal interface
  - Smooth animations and transitions
  - Consistent color scheme and typography
  - Responsive design for all screen sizes
- [ ] Add toast notifications for user feedback
- [ ] Implement loading spinners and progress indicators
- [ ] Create intuitive error states and recovery options

### 7.2 Performance Optimization
- [ ] Optimize React renders with useMemo/useCallback
- [ ] Implement proper cleanup for WebRTC resources
- [ ] Optimize bundle size with code splitting
- [ ] Add performance monitoring

### 7.3 Accessibility & Browser Support
- [ ] Ensure WCAG compliance:
  - Keyboard navigation
  - Screen reader support
  - Focus management
  - Color contrast
- [ ] Test browser compatibility:
  - Chrome (latest)
  - Edge (latest)
  - Safari >= 16.4
  - Firefox (latest)

## Phase 8: Testing & Validation

### 8.1 Feature Testing
- [ ] Validate all acceptance criteria:
  - ✅ User can join room and see self in participant list
  - ✅ User can toggle mic and be heard by another session
  - ✅ User can send and receive chat messages reliably
  - ✅ Active speaker indicator highlights current speaker
  - ✅ Leaving room cleans up tracks without console errors

### 8.2 Edge Case Testing
- [ ] Test network disconnection scenarios
- [ ] Test microphone permission denial
- [ ] Test token expiration handling
- [ ] Test multiple browser sessions
- [ ] Test mobile device compatibility

### 8.3 Performance Testing
- [ ] Measure join time (target: < 2s after token fetch)
- [ ] Test audio latency (target: < 200ms end-to-end)
- [ ] Test with poor network conditions
- [ ] Validate memory usage and cleanup

## Phase 9: Deployment & Configuration

### 9.1 Production Build
- [ ] Configure Vite for production build
- [ ] Optimize bundle size and assets
- [ ] Set up environment variable handling
- [ ] Create build validation scripts

### 9.2 Vercel Deployment
- [ ] Configure Vercel project
- [ ] Set up environment variables
- [ ] Configure custom domain (if needed)
- [ ] Set up deployment previews

### 9.3 Monitoring & Analytics
- [ ] Implement basic telemetry:
  - Join/leave events
  - Connection quality metrics
  - Error tracking
- [ ] Set up optional metrics endpoint
- [ ] Configure logging for production

## Technical Requirements Checklist

### Dependencies
- [ ] `livekit-client` - Core LiveKit functionality
- [ ] `@livekit/components-react` - React components
- [ ] `react` + `react-dom` - UI framework
- [ ] `typescript` - Type safety
- [ ] `vite` - Build tool
- [ ] `tailwindcss` - Styling
- [ ] `lucide-react` - Icons
- [ ] `uuid` - ID generation

### Configuration Files
- [ ] `package.json` - Dependencies and scripts
- [ ] `tsconfig.json` - TypeScript configuration
- [ ] `tailwind.config.js` - TailwindCSS configuration
- [ ] `vite.config.ts` - Vite build configuration
- [ ] `vercel.json` - Deployment configuration

### Key Files Structure
```
src/
├── components/
│   ├── JoinForm.tsx
│   ├── RoomView.tsx
│   ├── AudioControls.tsx
│   ├── ParticipantsList.tsx
│   └── ChatPanel.tsx
├── services/
│   ├── tokenService.ts
│   ├── livekitService.ts
│   ├── audioService.ts
│   └── chatService.ts
├── hooks/
│   ├── useRoom.ts
│   ├── useAudio.ts
│   └── useChat.ts
├── types/
│   ├── chat.ts
│   ├── participant.ts
│   └── api.ts
├── utils/
│   ├── logger.ts
│   ├── errorHandler.ts
│   └── constants.ts
├── config/
│   └── constants.ts
└── App.tsx
```

## Risk Mitigation

### Technical Risks
- **WebRTC compatibility**: Test across all target browsers early
- **Network reliability**: Implement robust retry and reconnection logic
- **Audio permissions**: Provide clear user guidance and fallbacks
- **Token expiration**: Implement proactive token refresh

### User Experience Risks
- **Join failures**: Provide clear error messages and recovery steps
- **Audio quality**: Implement quality monitoring and user feedback
- **Chat reliability**: Ensure message delivery with proper retry logic
- **Mobile experience**: Test thoroughly on mobile devices

## Success Metrics
- Join success rate > 95%
- Audio latency < 200ms
- Chat message delivery > 99%
- Zero console errors on clean room leave
- Mobile compatibility across major devices

## Information Required from User
1. **Branding preferences** - Colors, logos, app name
2. **User ID generation strategy** - How to generate X-User-Id header
3. **Error handling preferences** - How detailed should error messages be
4. **Analytics requirements** - What metrics to track
5. **Custom domain** - For Vercel deployment
6. **Testing environment** - Access to test the backend endpoints

This plan provides a comprehensive roadmap for building the LiveKit Voice+Chat Mini Interface with proper architecture, testing, and deployment considerations.
