---
description: Total project requirement
auto_execution_mode: 1
---

# LiveKit Voice+Chat Mini Interface — Requirements (MVP → v1.0)

## 1) Goal & Non‑Goals

**Goal:** Ship a lightweight web interface that connects to LiveKit to support **real‑time voice** (mic ↔ speaker) and **text chat** (bi‑directional), with a clean minimal UI and a small server that issues access tokens. This is to have conversation between a single user with server backend. that means a participant and agent.

**Non‑Goals:** Full contact list, push notifications, PSTN, advanced conferencing tools (whiteboard, screen share) — unless explicitly added to v1 scope.

---

## 2) User Roles & Scenarios

* **Guest/User:** Opens page, enters a display name (optional), joins a room, can talk via mic, hear remote audio, and exchange text messages.
*

**Scenarios (MVP):**

1. Join a  room livekit commonenents by correcting using tokenn key
2. Toggle microphone on/off; see mic level meter.
3. Send/receive text messages with timestamps.
4. See who’s speaking (active speaker indicator).
5. Leave the room cleanly.

---

## 3) Core Features (MVP)

1. **Auth & Room Join**

   * Token fetched from a tiny backend (
     curl --location '[https://us-central1-openlabel-lab-firebase.cloudfunctions.net/slang-session-connect?provider=elevenlabs&voice_id=EXAVITQu4vr4xnSDxMaL](https://us-central1-openlabel-lab-firebase.cloudfunctions.net/slang-session-connect?provider=elevenlabs&voice_id=EXAVITQu4vr4xnSDxMaL)' \

     --header 'X-User-Id: 12')
     → returns JWT.
   * token key used to join the room using---[https://slang-agent-555118069489.us-central1.run.app](https://slang-agent-555118069489.us-central1.run.app) livekit server is hosted here

2. **Audio**

   * Mic capture (Web Audio/MediaDevices).
   * Publish local audio track; subscribe to remote participants’ audio.
   * VAD-based speaking indicator (client side; visual UI dot/border glow).

3. **Text Chat**

   * Use LiveKit **DataChannel** for chat.
   * Message payload schema: `{id, sender, text, ts}`.
   * Basic delivery state (sent/received); simple retry if DC not ready.

4. **Presence & UI**

   * Participant list with mute state and speaking indicator.
   * Minimal room header: room name, connection state, leave button.
   * Toast/error banners for join failures, permission blocks, disconnects.

5. **Basic Telemetry**

   * Console logs for join/leave, track publish/subscribe, DC open/close.
   * Optional: simple `POST /api/metrics` for join/leave counts.

##

---

## 5) Architecture Overview$1

---

## 5.1) Reliability — Logging & Retry

**Client Logging**

* Log levels: `info`, `warn`, `error` with tags `[auth]`, `[rtc]`, `[chat]`, `[ui]`.
* Always log: join/leave, token fetch start/end, connect/reconnect, track pub/sub, DataChannel open/close, message send/receive failures.
* **Redaction:** never print JWT; truncate participant IDs to 6 chars; strip PII from payloads.
* Surface errors via toasts; aggregate recent errors in a collapsible "Debug" drawer.

**Retry Strategy**

* **Token fetch (`POST TOKEN_URL`)**: exponential backoff (base 500ms, factor 2, jitter ±250ms), max 5 attempts; abort on HTTP 401/403.
* **LiveKit connect**: if initial connect fails (network), retry with backoff `0.5s → 1s → 2s → 4s → 8s` (max 5); stop on auth errors.
* **Reconnection**: handle `RoomEvent.Reconnecting` and `RoomEvent.Disconnected`.

  * If disconnected due to network, attempt `room.connect(serverUrl, token)` with capped backoff up to 30s total.
  * On success, reopen DataChannel if needed and resubscribe.

**Pseudo-code**

```ts
async function withRetry<T>(fn: () => Promise<T>, canRetry: (e:any)=>boolean) {
  let delay = 500; for (let i=0;i<5;i++){ try { return await fn(); } catch(e){ if(!canRetry(e)) throw e; await sleep(delay + Math.random()*250); delay = Math.min(delay*2, 8000);} }
  throw new Error('retry_exhausted');
}
```

---

## 6) API Contract (Token Server)

### POST /api/token

**Request**

```json
curl --location 'https://us-central1-openlabel-lab-firebase.cloudfunctions.net/slang-session-connect?provider=elevenlabs&voice_id=EXAVITQu4vr4xnSDxMaL' \
--header 'X-User-Id: 12'
```

* `identity`: unique per participant (client can generate UUID if absent).

**Response**

```json
{
    "serverUrl": "wss://thinkloud-9x8bbl7h.livekit.cloud",
    "roomName": "voice_room_1027_1762670923315",
    "participantName": "12",
    "participantToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiMTIiLCJtZXRhZGF0YSI6IntcInByb3ZpZGVyXCI6XCJlbGV2ZW5sYWJzXCIsXCJ2b2ljZUlkXCI6XCJFWEFWSVRRdTR2cjR4blNEeE1hTFwiLFwic2Vzc2lvbklkXCI6bnVsbCxcInVzZXJJZFwiOlwiMTJcIixcIm5ld0NvbnZlcnNhdGlvblwiOmZhbHNlLFwibWFya2V0TG9jYXRpb25cIjpudWxsfSIsInZpZGVvIjp7InJvb21Kb2luIjp0cnVlLCJyb29tIjoidm9pY2Vfcm9vbV8xMDI3XzE3NjI2NzA5MjMzMTUiLCJjYW5QdWJsaXNoIjp0cnVlLCJjYW5TdWJzY3JpYmUiOnRydWUsImNhblB1Ymxpc2hEYXRhIjp0cnVlfSwic3ViIjoiMTIiLCJpc3MiOiJBUEl5UjdDZVBCVVJWVzkiLCJuYmYiOjE3NjI2NzA5MjMsImV4cCI6MTc2MjY3MTIyM30.JR26adLUe0HOGJyp9qHrDvzwDqxmXDofuKZWth4164k"
}
```

---

## 7) Events & Client State

* **Connection**: `connecting` → `connected` → `reconnecting` → `disconnected`.
* **Tracks**: local audio published/unpublished, remote subscribed/unsubscribed.
* **DataChannel**: open/close, message receive.

**UI Reactions**

* Banner on reconnect; disable send when DC closed; grey mic button if device denied.

---

## 8) UI/UX Requirements

* **Layout:** 2‑pane (left: participants & audio controls; right: chat panel).
* **Accessibility:** keyboard focus ring, ARIA labels for buttons, screen‑reader friendly.
* **Empty States:** no participants → show hint; no messages → prompt to start chat.
* **Latency Info:** small “RTT: xx ms” text in footer (optional).

---

## 9) Permissions & Privacy

* Prompt for mic permission only on join.
* No persistent storage of raw audio in MVP.
* Log redaction: do not print JWT; mask PII in telemetry.

---

## 10) Security

* Token endpoint protected by CORS allowlist and optional room allowlist.
* Short‑lived tokens (e.g., 5–10 minutes) with room‑scoped grants.
* HTTPS everywhere; WSS only.

---

## 11) Non‑Functional Requirements

* **Join time:** < 2s after token fetch (network permitting).
* **Latency:** end‑to‑end audio < 200ms typical on same continent.
* **Uptime:** relies on LiveKit; token server should be stateless & autoscalable.
* **Browser Support:** Latest Chrome, Edge; Safari >= 16.4 (WebRTC); Firefox latest.

---

## 12) Acceptance Criteria (MVP)

* ✅ User can join a named room and see self in participant list.
* ✅ User can toggle mic and be heard by another browser session.
* ✅ User can send and receive chat messages reliably.
* ✅ Active speaker indicator highlights the current speaker.
* ✅ Leaving the room cleans up tracks and closes DC without console errors.

---

## 13) Milestones & Tasks

** Client MVP **

* Project setup (Vite + React + TS).
* Join form → fetch token → connect.
* Publish mic; render participants; chat DC.
* Speaking indicator, basic toasts.

---

## 14) Data Models

**ChatMessage**

```ts
export type ChatMessage = {
  id: string; // uuid
  senderId: string;
  senderName?: string;
  text: string;
  ts: number; // epoch ms
};
```

**Participant** (UI shape)

```ts
export type UIParticipant = {
  id: string;
  name?: string;
  isSpeaking: boolean;
  isMuted: boolean;
};
```

---

## 15) Minimal React Component Map

* `<JoinForm onJoin(room, name)/>`
* `<RoomView>` (holds connection, children)

  * `<AudioControls>` (mute/unmute, level meter)
  * `<ParticipantsList>`
  * `<ChatPanel>` (messages + input)

---

## 16)  Plan

* this is to build to talk between livekit server and only one participant

---

## 17) Deployment

* **Token server:**already running backend
* **Frontend:** Vercel; configure env for token endpoint and LiveKit URL.

---

## 18. coding

* url and other things needs to in way to configured
* consider to use global var as in the project
* Don't write too much of the code
* deploy it in vercel frontend
* list things that required from me, so that i can collect and give back to you
* while coding refere livekit documentation wherever necessary

---

## 19) Appendix — Env & Config

**Runtime Config (no `.env` needed)**

* `TOKEN_URL = https://us-central1-openlabel-lab-firebase.cloudfunctions.net/slang-session-connect`
* `LIVEKIT_URL = wss://thinkloud-9x8bbl7h.livekit.cloud`

**Notes**

* Frontend reads these constants from a small `config.ts` (or inline constants). No API keys or secrets are required on the client.
* Token request must include `X-User-Id` header and any required query params (e.g., `provider`, `voice_id`).
* If endpoints change, update `config.ts` and redeploy the frontend.

**Optional (local dev)**

* You may override via query string (`?tokenUrl=...&livekitUrl=...`) to avoid rebuilds.

---

**End of Requirements**
