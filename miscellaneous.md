# Miscellaneous Technical Notes

## Project: LiveKit Voice+Chat Mini Interface

### Important Technical Decisions

#### Architecture Choices
- **Framework**: React + TypeScript + Vite (chosen for fast development and modern tooling)
- **Styling**: TailwindCSS (for rapid UI development and consistency)
- **State Management**: React Context + Custom Hooks (avoiding over-engineering with Redux)
- **WebRTC Library**: LiveKit Client SDK (as per requirements)

#### API Integration Notes
- **Token Endpoint**: `https://us-central1-openlabel-lab-firebase.cloudfunctions.net/slang-session-connect`
  - Requires `X-User-Id` header
  - Query params: `provider=elevenlabs&voice_id=EXAVITQu4vr4xnSDxMaL`
  - Returns JWT token with room details
- **LiveKit Server**: `wss://thinkloud-9x8bbl7h.livekit.cloud`
- **Authentication**: Token-based, no API keys needed on client

#### Key Implementation Patterns

##### Error Handling Strategy
```typescript
// Retry pattern with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, canRetry: (e:any)=>boolean) {
  let delay = 500; 
  for (let i=0;i<5;i++){ 
    try { 
      return await fn(); 
    } catch(e){ 
      if(!canRetry(e)) throw e; 
      await sleep(delay + Math.random()*250); 
      delay = Math.min(delay*2, 8000);
    } 
  }
  throw new Error('retry_exhausted');
}
```

##### Logging Pattern
- Use structured logging with tags: `[auth]`, `[rtc]`, `[chat]`, `[ui]`
- Always redact sensitive data (JWT tokens, PII)
- Truncate participant IDs to 6 characters for logs

##### DataChannel Message Format
```typescript
export type ChatMessage = {
  id: string; // uuid
  senderId: string;
  senderName?: string;
  text: string;
  ts: number; // epoch ms
};
```

### Common Issues & Solutions

#### WebRTC Permission Issues
- **Problem**: Microphone permission denied
- **Solution**: Implement graceful fallback, clear user messaging, retry mechanism
- **Code Pattern**: Always check `navigator.mediaDevices.getUserMedia` before proceeding

#### LiveKit Connection Issues
- **Problem**: Connection failures due to network
- **Solution**: Implement reconnection with capped backoff (max 30s total)
- **Monitoring**: Track `RoomEvent.Reconnecting` and `RoomEvent.Disconnected`

#### DataChannel Reliability
- **Problem**: Messages lost when DataChannel not ready
- **Solution**: Queue messages and retry when channel reopens
- **Pattern**: Check `dataChannel.readyState` before sending

#### Token Expiration
- **Problem**: JWT tokens expire during session
- **Solution**: Implement proactive token refresh before expiry
- **Timing**: Refresh when 80% of token lifetime has passed

### Browser Compatibility Notes

#### Supported Browsers
- Chrome (latest) - Full support
- Edge (latest) - Full support  
- Safari >= 16.4 - WebRTC support required
- Firefox (latest) - Full support

#### Known Limitations
- Safari: Some WebRTC features may have delays
- Mobile Safari: Audio autoplay restrictions
- Firefox: DataChannel message size limits

### Performance Considerations

#### Bundle Size Optimization
- Use dynamic imports for LiveKit components
- Implement code splitting for non-critical features
- Tree-shake unused TailwindCSS classes

#### Memory Management
- Always cleanup WebRTC tracks on component unmount
- Remove event listeners properly
- Clear timers and intervals

#### Audio Optimization
- Use VAD (Voice Activity Detection) to reduce bandwidth
- Implement audio level monitoring for UI feedback
- Consider audio quality settings based on network

### Security Notes

#### Client-Side Security
- Never store JWT tokens in localStorage (use memory only)
- Implement CORS properly on token endpoint
- Use HTTPS/WSS only in production

#### Data Privacy
- No persistent storage of audio data
- Redact PII from all logging
- Implement proper session cleanup

### Deployment Configuration

#### Vercel Settings
- Build command: `npm run build`
- Output directory: `dist`
- Node.js version: 18.x
- Environment variables: None needed (using constants)

#### Environment Variables (Optional)
```bash
# For development overrides
VITE_TOKEN_URL=https://...
VITE_LIVEKIT_URL=wss://...
```

### Testing Strategy

#### Unit Tests
- Token service retry logic
- Message formatting and validation
- Audio state management
- Error handling utilities

#### Integration Tests
- Full join flow (token → connect → audio → chat)
- Reconnection scenarios
- Cross-browser compatibility
- Mobile device testing

#### Manual Testing Checklist
- [ ] Join room successfully
- [ ] Toggle microphone on/off
- [ ] Send/receive chat messages
- [ ] Handle network disconnection
- [ ] Clean room exit
- [ ] Multiple participant sessions

### Debugging Tips

#### Common Debug Commands
```javascript
// Check LiveKit room state
console.log(room.state, room.participants);

// Check DataChannel state
console.log(dataChannel.readyState);

// Monitor audio tracks
room.localParticipant.audioTracks.forEach(track => 
  console.log(track.trackSid, track.isMuted)
);
```

#### Useful Browser DevTools
- Network tab: Monitor WebSocket connections
- Console: Filter by log tags [auth], [rtc], [chat]
- Application tab: Check for memory leaks
- Media tab: Monitor WebRTC stats

### Future Enhancement Ideas
- Screen sharing capability
- Recording functionality
- Multiple room support
- Advanced audio settings
- Push notifications
- Mobile app version

### Dependencies Version Notes
- `livekit-client`: Use latest stable version
- `react`: 18.x for concurrent features
- `typescript`: 5.x for latest language features
- `vite`: 5.x for optimal build performance

### Known Workarounds
- Safari audio autoplay: Require user gesture before audio
- Mobile keyboard: Handle viewport changes for chat input
- Firefox DataChannel: Limit message size to 64KB
- Edge WebRTC: May need additional polyfills for older versions

---

**Last Updated**: Phase 1 completed - Project foundation established
**Next Review**: After Phase 2 completion (Authentication & Connection)

### Phase 1 Completion Notes
- ✅ Vite + React + TypeScript project initialized
- ✅ Core dependencies installed (livekit-client, tailwindcss, lucide-react, uuid)
- ✅ TypeScript configured with strict mode
- ✅ TailwindCSS configured with modern setup
- ✅ Project structure created (components/, services/, hooks/, types/, utils/, config/)
- ✅ Constants file created with API endpoints and configuration
- ✅ Type definitions created for chat, participant, and API
- ✅ Logger utility implemented with PII redaction
- ✅ Error handler utility created with user-friendly messages
- ✅ Basic UI structure implemented with responsive design
- ✅ Comprehensive README.md documentation created

### Ready for Phase 2
The foundation is now complete and ready for implementing:
1. Token management service
2. LiveKit connection service  
3. Authentication flow
4. Connection state management
