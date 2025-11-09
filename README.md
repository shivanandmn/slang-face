# LiveKit Voice+Chat Mini Interface

A lightweight web interface for real-time voice and text chat using LiveKit WebRTC, featuring a single participant talking to a server backend agent.

## 🚀 Features

- **Real-time Voice Communication**: WebRTC-based audio with LiveKit
- **Text Chat**: DataChannel-based messaging system
- **Modern UI**: Clean interface built with React + TailwindCSS
- **TypeScript**: Full type safety and developer experience
- **Responsive Design**: Works on desktop and mobile devices
- **Audio Controls**: Mute/unmute functionality with visual feedback
- **Connection Management**: Automatic reconnection and error handling

## 🏗️ Architecture

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS + Lucide Icons
- **Real-time**: LiveKit WebRTC + DataChannel
- **Authentication**: Token-based via existing backend
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Modern web browser with WebRTC support

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd slang-face
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env.local` file:
   ```env
   VITE_LOG_LEVEL=info
   VITE_API_BASE_URL=https://us-central1-openlabel-lab-firebase.cloudfunctions.net/slang-session-connect
   VITE_LIVEKIT_URL=wss://thinkloud-9x8bbl7h.livekit.cloud
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🚀 Development

### Project Structure

```
src/
├── components/          # React components
│   ├── JoinForm.tsx    # Room joining interface
│   ├── RoomView.tsx    # Main room container
│   ├── AudioControls.tsx # Audio control buttons
│   ├── ParticipantsList.tsx # Participant display
│   └── ChatPanel.tsx   # Chat interface
├── services/           # Business logic services
│   ├── tokenService.ts # Authentication tokens
│   ├── livekitService.ts # LiveKit connection
│   ├── audioService.ts # Audio management
│   └── chatService.ts  # Chat messaging
├── hooks/              # Custom React hooks
│   ├── useRoom.ts      # Room state management
│   ├── useAudio.ts     # Audio state management
│   └── useChat.ts      # Chat state management
├── types/              # TypeScript definitions
│   ├── chat.ts         # Chat message types
│   ├── participant.ts  # Participant types
│   └── api.ts          # API response types
├── utils/              # Utility functions
│   ├── logger.ts       # Structured logging
│   ├── errorHandler.ts # Error management
│   └── constants.ts    # App constants
├── config/             # Configuration
│   └── constants.ts    # API endpoints & settings
└── App.tsx             # Main application component
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### API Configuration

The application connects to:
- **Token Endpoint**: `https://us-central1-openlabel-lab-firebase.cloudfunctions.net/slang-session-connect`
- **LiveKit Server**: `wss://thinkloud-9x8bbl7h.livekit.cloud`
- **Required Headers**: `X-User-Id`
- **Default Provider**: `elevenlabs`
- **Default Voice**: `EXAVITQu4vr4xnSDxMaL`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |
| `VITE_API_BASE_URL` | Token service URL | See constants.ts |
| `VITE_LIVEKIT_URL` | LiveKit server URL | See constants.ts |

### Logging

The application uses structured logging with PII redaction:
- **Tags**: `[auth]`, `[rtc]`, `[chat]`, `[ui]`, `[audio]`
- **Levels**: debug, info, warn, error
- **PII Protection**: JWT tokens and IDs are automatically masked

## 🧪 Testing

### Manual Testing Checklist

- [ ] User can join room and see self in participant list
- [ ] User can toggle mic and be heard by another session
- [ ] User can send and receive chat messages reliably
- [ ] Active speaker indicator highlights current speaker
- [ ] Leaving room cleans up tracks without console errors

### Performance Targets

- Join time: < 2s after token fetch
- Audio latency: < 200ms end-to-end
- Chat message delivery: > 99%
- Zero console errors on clean room leave

## 🚀 Deployment

### Vercel Deployment

1. **Connect to Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Set Environment Variables**
   Configure in Vercel dashboard or via CLI:
   ```bash
   vercel env add VITE_LOG_LEVEL
   vercel env add VITE_API_BASE_URL
   vercel env add VITE_LIVEKIT_URL
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

## 🐛 Troubleshooting

### Common Issues

1. **Microphone Permission Denied**
   - Ensure HTTPS connection
   - Check browser permissions
   - Try refreshing the page

2. **Connection Failures**
   - Verify network connectivity
   - Check firewall settings
   - Ensure WebRTC ports are open

3. **Audio Not Working**
   - Check microphone permissions
   - Verify audio device selection
   - Test in different browsers

### Debug Mode

Enable debug logging:
```env
VITE_LOG_LEVEL=debug
```

## 📚 Documentation

- [LiveKit Documentation](https://docs.livekit.io/)
- [React Documentation](https://react.dev/)
- [TailwindCSS Documentation](https://tailwindcss.com/)
- [Vite Documentation](https://vitejs.dev/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
```
