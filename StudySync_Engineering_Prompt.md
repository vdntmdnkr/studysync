# StudySync — Full Engineering Prompt
> Collaborative real-time study app for two users | Electron + WebRTC + Antigravity

---

## 1. Product Overview

**StudySync** is a desktop application for macOS and Windows that lets exactly two people (a study pair or couple) study together in real time — sharing a PDF, annotating it simultaneously with distinct cursors and colours, watching videos in sync, listening to shared music, and taking notes — all in a single focused interface.

It is NOT a general meeting tool. It is purpose-built for deep two-person study sessions with low-network resilience, collaborative annotation, and ambient study features that Google Meet, Zoom, and similar tools completely lack.

---

## 2. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Desktop shell | **Electron v30+** | Cross-platform Mac + Windows, access to native APIs |
| UI framework | **React 18 + TypeScript** | Component model, hooks, strict typing |
| State management | **Zustand** | Lightweight, no boilerplate |
| Real-time sync | **WebRTC (data channels + media)** | Peer-to-peer, low latency, works without central server for media |
| Collaborative data | **Yjs (CRDT)** | Conflict-free real-time sync for annotations + notes |
| Signalling server | **Antigravity** | Room management, signalling, TURN relay, presence |
| PDF rendering | **PDF.js (Mozilla)** | In-browser PDF rendering with custom annotation layer |
| Local storage | **SQLite via better-sqlite3** | Offline queue, session history, notes persistence |
| Audio | **Web Audio API** | Shared music sync, volume control |
| Video sync | **HTML5 Video + WebRTC data channel** | Play/pause/seek state sync |
| Styling | **Tailwind CSS + CSS Variables** | Consistent design tokens, dark/light mode |
| Packaging | **electron-builder** | Produce .dmg (Mac) and .exe/.msi (Windows) installers |
| E2E encryption | **libsodium.js** | Encrypt all data channel messages |

---

## 3. Project Structure

```
studysync/
├── electron/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # Context bridge (IPC)
│   └── menu.ts              # Native app menu
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   └── store/
│   │       ├── sessionStore.ts       # Room, peer, connection state
│   │       ├── annotationStore.ts    # Yjs-backed annotation state
│   │       ├── notesStore.ts         # Yjs-backed shared notes
│   │       ├── musicStore.ts         # Music playback state
│   │       └── networkStore.ts       # Network quality state
│   ├── screens/
│   │   ├── Home.tsx                  # Create/Join room screen
│   │   ├── Session.tsx               # Main study session layout
│   │   └── SessionEnd.tsx            # Session summary + export
│   ├── components/
│   │   ├── pdf/
│   │   │   ├── PDFViewer.tsx         # PDF.js renderer
│   │   │   ├── AnnotationLayer.tsx   # Canvas overlay for annotations
│   │   │   ├── CursorLayer.tsx       # Dual cursor rendering
│   │   │   └── StickyNote.tsx        # Draggable sticky note component
│   │   ├── video/
│   │   │   ├── VideoPlayer.tsx       # Shared video player
│   │   │   └── VideoSync.ts          # Play/pause/seek sync logic
│   │   ├── music/
│   │   │   ├── MusicPanel.tsx        # Music player UI
│   │   │   └── MusicSync.ts          # Music state sync logic
│   │   ├── camera/
│   │   │   ├── CameraFeed.tsx        # Local + remote video feeds
│   │   │   └── MediaControls.tsx     # Mic/cam toggle
│   │   ├── notes/
│   │   │   ├── NotesPanel.tsx        # Side notes panel
│   │   │   ├── SharedNotes.tsx       # Yjs-synced shared notes
│   │   │   └── PrivateNotes.tsx      # Local-only notes
│   │   ├── timer/
│   │   │   ├── PomodoroTimer.tsx     # Synced countdown timer
│   │   │   └── TimerSync.ts          # Timer state sync
│   │   ├── toolbar/
│   │   │   └── Toolbar.tsx           # Bottom annotation tool selector
│   │   └── network/
│   │       └── NetworkMonitor.tsx    # Network quality badge + auto-degrade
│   ├── lib/
│   │   ├── webrtc/
│   │   │   ├── PeerConnection.ts     # WebRTC connection manager
│   │   │   ├── DataChannel.ts        # Typed data channel wrapper
│   │   │   └── SignalClient.ts       # Antigravity signalling client
│   │   ├── yjs/
│   │   │   ├── yjsProvider.ts        # Yjs WebRTC provider setup
│   │   │   └── yjsTypes.ts           # Typed Yjs document schema
│   │   ├── crypto/
│   │   │   └── e2e.ts                # libsodium encrypt/decrypt helpers
│   │   ├── export/
│   │   │   └── exportSession.ts      # Export annotated PDF + notes
│   │   └── replay/
│   │       └── sessionRecorder.ts    # Event recording for session replay
│   └── assets/
│       └── music/                    # Bundled royalty-free lo-fi tracks
├── server/                           # Antigravity signalling server
│   ├── index.ts
│   ├── rooms.ts
│   └── turn.ts
├── electron-builder.config.js
├── package.json
└── tsconfig.json
```

---

## 4. Antigravity Backend — Signalling Server

Deploy a lightweight Antigravity signalling server. Its only jobs are:

1. **Room creation** — generate a unique 6-digit alphanumeric room code
2. **Peer signalling** — relay WebRTC SDP offer/answer and ICE candidates between the two peers
3. **TURN relay** — provide TURN server credentials for users behind symmetric NATs
4. **Presence** — notify when the second peer joins or disconnects

### Room lifecycle
```
Peer A: POST /rooms → { roomCode: "XK4F2R", token: "..." }
Peer B: POST /rooms/XK4F2R/join → { token: "..." }
Both:   WS /rooms/XK4F2R/signal → exchange SDP + ICE
```

### Signalling message types
```typescript
type SignalMessage =
  | { type: 'offer';     sdp: RTCSessionDescriptionInit }
  | { type: 'answer';    sdp: RTCSessionDescriptionInit }
  | { type: 'ice';       candidate: RTCIceCandidateInit }
  | { type: 'peer-joined' }
  | { type: 'peer-left' }
  | { type: 'room-full' }
```

After WebRTC connection is established, the server is no longer in the media path. All communication goes peer-to-peer.

---

## 5. WebRTC Architecture

### Media streams
- **Audio track** — always on (mutable), 48kHz, Opus codec
- **Video track** — camera feed, 480p default, drops to off in low-bandwidth mode
- **Screen share track** — optional, replaces video track

### Data channels (one per concern, all ordered + reliable unless noted)

| Channel name | Mode | Purpose |
|---|---|---|
| `annotations` | Yjs CRDT | Annotation operations (replicated via Yjs) |
| `cursors` | unordered, unreliable | Cursor position at 30fps |
| `music-sync` | ordered | Track name, timestamp, play/pause state |
| `video-sync` | ordered | Video URL, timestamp, play/pause/seek |
| `timer-sync` | ordered | Pomodoro state |
| `notes` | Yjs CRDT | Shared notes (replicated via Yjs) |
| `presence` | ordered | Typing indicators, raise-hand, reactions |

All data channel messages are encrypted with libsodium (XSalsa20-Poly1305) using a shared session key derived from the room code via HKDF.

---

## 6. Feature Specifications

### 6.1 Dual PDF Annotation

**Rendering:**
- Load PDF with PDF.js `pdfjsLib.getDocument()`
- Render each page to a `<canvas>` element
- Overlay a transparent SVG/canvas annotation layer on top of each page

**Annotation tools:**
- **Highlight** — coloured rectangle over text selection
- **Pen** — freehand path (SVG `<path>` with points array)
- **Sticky note** — draggable note anchored to page coordinates
- **Text box** — inline text annotation

**Dual-user colour assignment:**
- Session creator (Peer A) = `#FF6B6B` (coral-red)
- Peer B = `#4ECDC4` (teal)
- Colours shown in cursors, annotation outlines, and name badges

**Yjs data model:**
```typescript
// Y.Map per page, keyed by annotationId
type Annotation = {
  id: string
  type: 'highlight' | 'pen' | 'sticky' | 'text'
  userId: 'A' | 'B'
  pageNumber: number
  data: HighlightData | PenData | StickyData | TextData
  createdAt: number
}
```

Yjs handles all merge conflicts automatically — if both users add an annotation at the same millisecond, both appear.

**Persistence:** Save Yjs document state to SQLite after every operation. Restore on reconnect.

---

### 6.2 Dual Cursor Tracking

- On `mousemove` over the PDF canvas, convert pixel coords to normalised page coords `(x: 0–1, y: 0–1)` relative to the page
- Send via the `cursors` data channel (unreliable, 30fps throttle):
```typescript
type CursorMessage = {
  userId: 'A' | 'B'
  pageNumber: number
  x: number   // 0–1 normalised
  y: number   // 0–1 normalised
}
```
- Render remote cursor as SVG arrow in the remote user's colour with their name label
- Apply CSS `pointer-events: none` so it doesn't interfere with annotations
- Fade out after 2 seconds of inactivity

---

### 6.3 Camera and Microphone

- Request `getUserMedia({ video: true, audio: true })` on session start
- Add tracks to the RTCPeerConnection
- Display local feed (mirrored) in a small panel — 120×90px
- Display remote feed in an equal-sized panel
- Controls:
  - Mute/unmute mic — `track.enabled = false/true`
  - Camera on/off — replace track with black frame when off
  - In low-bandwidth mode: stop video track entirely, keep audio

---

### 6.4 Shared Study Music

**Bundled tracks:**
- Include 8–10 royalty-free lo-fi / ambient tracks in `src/assets/music/`
- Track metadata: title, artist, duration, BPM category

**Sync protocol via `music-sync` data channel:**
```typescript
type MusicSyncMessage = {
  action: 'play' | 'pause' | 'seek' | 'change-track'
  trackIndex?: number
  timestamp?: number   // seconds into track
  serverTime: number   // Date.now() of sender for drift correction
}
```

**Drift correction:**
- On receiving a `play` message, calculate network latency from `serverTime`
- Set `audio.currentTime = timestamp + (latency / 2 / 1000)`

**Volume:** Local only — each user controls their own volume slider.

---

### 6.5 Shared Video Player

**Supported sources:**
- YouTube URLs (via `iframe` with `postMessage` YouTube Player API)
- Local video files (MP4, MKV) via Electron `file://` protocol
- Direct video URLs

**Sync protocol via `video-sync` data channel:**
```typescript
type VideoSyncMessage = {
  action: 'load' | 'play' | 'pause' | 'seek'
  url?: string
  timestamp?: number
  serverTime: number
}
```

**Sync correction:**
- Every 5 seconds, both peers emit their current `currentTime`
- If diff > 500ms, the peer that is ahead seeks back to the average
- Show a subtle "Syncing..." indicator when correction fires

**Controls:** Either user can use the playback controls — changes sync to both.

---

### 6.6 Pomodoro Focus Timer

**Default settings:** 25 min focus / 5 min break (customisable per session)

**Sync protocol via `timer-sync` data channel:**
```typescript
type TimerSyncMessage = {
  action: 'start' | 'pause' | 'reset' | 'settings-change'
  phase: 'focus' | 'break'
  endsAt: number        // Unix timestamp when current phase ends
  focusDuration: number // minutes
  breakDuration: number // minutes
}
```

**Behaviour:**
- Both users see identical countdown (synced via `endsAt` absolute timestamp, not relative)
- Music auto-pauses when break starts; auto-resumes when focus starts
- Native OS notification at phase transitions
- Track cumulative study time in SQLite — show session stats at end

---

### 6.7 Side Notes Panel

**Layout:** Slide-in panel from the right side of the PDF viewer

**Two tabs:**
1. **My notes** — stored locally in SQLite, never synced
2. **Shared notes** — Yjs `Y.Array` of note objects, synced in real time

**Note data model:**
```typescript
type Note = {
  id: string
  userId: 'A' | 'B'
  content: string         // Plain text or Markdown
  linkedPage?: number     // PDF page number
  linkedTimestamp?: number // Video timestamp in seconds
  createdAt: number
  updatedAt: number
}
```

**Features:**
- Click a shared note to jump to its linked PDF page or video timestamp
- Typing indicator: show "(Priya is typing...)" when remote user is editing
- Tag system: `#important`, `#exam`, `#review`

---

### 6.8 Low-Bandwidth / Weak Network Mode

**Network monitoring (every 3 seconds):**
```typescript
// Use WebRTC getStats() API
const stats = await peerConnection.getStats()
// Extract: roundTripTime, packetsLost, availableOutgoingBitrate
```

**Thresholds and auto-actions:**

| Condition | Action |
|---|---|
| RTT > 300ms | Show "Weak connection" badge |
| RTT > 600ms OR packet loss > 5% | Disable video track, keep audio |
| RTT > 1200ms OR packet loss > 15% | Switch to audio-only, reduce cursor update rate to 5fps |
| Connection drops entirely | Queue notes/annotations in SQLite offline queue |
| Connection restores | Flush SQLite queue via Yjs sync |

**Offline queue (SQLite schema):**
```sql
CREATE TABLE offline_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,           -- 'annotation' | 'note'
  payload TEXT NOT NULL,        -- JSON serialised operation
  created_at INTEGER NOT NULL,
  synced INTEGER DEFAULT 0
);
```

On reconnect, replay unsynced operations through Yjs — Yjs handles merge automatically.

---

### 6.9 Session Replay

**Record during session:**
```typescript
type ReplayEvent = {
  t: number             // ms since session start
  type: 'annotation' | 'cursor' | 'note' | 'music' | 'video' | 'timer'
  userId: 'A' | 'B'
  payload: unknown
}
```

Store events in SQLite `replay_events` table during the session.

**Playback:**
- Scrubable timeline showing the full session
- Replay annotations appearing/disappearing, cursors moving, notes being added
- Speed controls: 1x, 2x, 4x
- Export replay as MP4 (use Electron's `desktopCapturer` to record the playback screen)

---

### 6.10 Session Export

At end of session, generate a single PDF containing:
1. Each annotated PDF page with all annotations (both users) baked in
2. All shared notes appended as a final page, sorted by page number
3. Session stats: duration, Pomodoro sessions completed, pages covered

Use `pdf-lib` to compose the export PDF programmatically.

---

## 7. Home Screen — Room Creation & Joining

```
┌─────────────────────────────────────┐
│         StudySync                   │
│   "Study together, anywhere"        │
│                                     │
│   [Create a room]                   │
│                                     │
│   ─── or join with a code ───       │
│   [  X K 4 F 2 R  ] [Join]         │
└─────────────────────────────────────┘
```

**Create room flow:**
1. App requests camera + mic permissions
2. POST to Antigravity → receive `roomCode`
3. Display room code prominently with a copy button
4. Navigate to Session screen, show "Waiting for your study partner..."

**Join room flow:**
1. User enters 6-character code
2. App verifies code with Antigravity
3. If valid and not full → join, initiate WebRTC handshake
4. If full → show "Room is full"

**No accounts required.** Room codes expire after 24 hours of inactivity.

---

## 8. Session Layout

```
┌──────────────── TopBar ─────────────────────────────────────┐
│ StudySync    [Room: XK4F2R]  [●Live]    [Invite] [End]      │
├──────────────────────────────────┬──────────────────────────┤
│                                  │  [Cam A]  [Cam B]        │
│         PDF Viewer               ├──────────────────────────┤
│   (annotation + cursor layers)   │  ♪ Music Panel           │
│                                  ├──────────────────────────┤
│                                  │  Notes Panel             │
│                                  │  [My Notes] [Shared]     │
│                                  │                          │
├──────────────────────────────────┴──────────────────────────┤
│ Toolbar: [✏ Pen] [▌Highlight] [📌 Sticky] [T Text] │ [📺 Video] [⏱ 23:45] │ 🟢 Network │
└─────────────────────────────────────────────────────────────┘
```

**Panels are resizable** via drag handles. Layout state persisted in `localStorage`.

---

## 9. Design System

**Fonts:**
- Display: `DM Serif Display` (headings, room code, logo)
- UI: `Sora` (all interface text)
- Mono: `DM Mono` (timestamps, room codes, labels, badges)

**Colour tokens:**
```css
--color-bg-deep:        #0d0d1a;
--color-bg-mid:         #141428;
--color-bg-surface:     #1e1e38;
--color-accent-green:   #5DCAA5;
--color-accent-red:     #FF6B6B;
--color-accent-teal:    #4ECDC4;
--color-text-primary:   #e8e8f0;
--color-text-secondary: #a0a0b8;
--color-text-muted:     rgba(255,255,255,0.35);
--color-border:         rgba(255,255,255,0.06);
```

**User identity:**
- Peer A always = `--color-accent-red` (`#FF6B6B`)
- Peer B always = `--color-accent-teal` (`#4ECDC4`)
- Used consistently: cursor colour, annotation colour, name badge, camera frame border

---

## 10. Security

- All WebRTC data channels encrypted with libsodium (XSalsa20-Poly1305)
- Session key derived from room code + random nonce via HKDF-SHA256
- Room codes are single-use after 2 peers join (no third party can join)
- No study content (PDFs, notes, annotations) ever stored on Antigravity server
- Antigravity only sees: room codes, WebRTC SDP/ICE signals, presence events
- SQLite database stored in Electron `userData` path, not synced to cloud

---

## 11. Packaging & Distribution

**electron-builder config:**
```javascript
module.exports = {
  appId: 'com.studysync.app',
  productName: 'StudySync',
  mac: {
    category: 'public.app-category.education',
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
    icon: 'assets/icon.icns'
  },
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'assets/icon.ico'
  },
  files: ['dist/**/*', 'electron/**/*', 'src/assets/music/**/*'],
  extraResources: [{ from: 'server/', to: 'server/' }]
}
```

**Auto-update:** Use `electron-updater` with a self-hosted or GitHub Releases update feed.

---

## 12. Build Commands

```bash
# Install dependencies
npm install

# Run in development
npm run dev              # Starts Vite + Electron concurrently

# Build for production
npm run build            # Vite build
npm run electron:build   # Package with electron-builder

# Run signalling server (Antigravity)
cd server && npm run start
```

---

## 13. Key NPM Dependencies

```json
{
  "dependencies": {
    "electron": "^30.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0",
    "yjs": "^13.6.0",
    "y-webrtc": "^10.3.0",
    "pdfjs-dist": "^4.4.0",
    "pdf-lib": "^1.17.0",
    "better-sqlite3": "^9.6.0",
    "libsodium-wrappers": "^0.7.13",
    "tailwindcss": "^3.4.0",
    "electron-builder": "^24.0.0",
    "electron-updater": "^6.2.0",
    "socket.io-client": "^4.7.0",
    "socket.io": "^4.7.0",
    "pako": "^2.1.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vite-plugin-electron": "^0.28.0",
    "@types/better-sqlite3": "^7.6.0"
  }
}
```

---

## 14. Development Milestones

| Phase | Scope | Target |
|---|---|---|
| **Phase 1** | Electron shell + room create/join + WebRTC audio/video | Week 1–2 |
| **Phase 2** | PDF viewer + dual annotation + dual cursors | Week 3–4 |
| **Phase 3** | Shared music + shared video player | Week 5 |
| **Phase 4** | Yjs notes panel + Pomodoro timer | Week 6 |
| **Phase 5** | Low-bandwidth mode + offline queue | Week 7 |
| **Phase 6** | Session export + replay | Week 8 |
| **Phase 7** | Polish, packaging, auto-update, beta testing | Week 9–10 |

---

*StudySync Engineering Prompt v1.0 — Generated for Antigravity + Electron + WebRTC stack*
