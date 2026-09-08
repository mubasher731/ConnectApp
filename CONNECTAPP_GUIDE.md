# 🔗 ConnectApp — Complete Developer Guide (Frontend + Backend)

**ConnectApp** is a role-based healthcare communication platform: **patients book and chat with
doctors**, get **live sessions**, and make **voice/video calls** — all driven by the **Fountain
Backend** (REST + Socket.IO). The React Native client talks **only to real backend endpoints**
(no mock layer).

> Companion docs: `PROGRESS_REPORT.md` (what was built), `API_INTEGRATION_GUIDE.md`,
> `BACKEND_VERIFICATION.md`.

---

## 1. Overview & Features

**Patients**
- Home (greeting, book, recent conversations) · Chats (session list) · **Calls (history)** ·
  Doctors + **Book Appointment** · Profile
- Persistent WhatsApp-style chat with the same doctor across sessions

**Doctors**
- Dashboard (stats, **Appointment Requests** Accept/Reject/Reschedule, recent appointments) ·
  Chats · Calls · Profile

**Shared / Real-time**
- Live chat (send = REST, receive = Socket.IO): typing, presence, session banners
- Session countdown + input auto-lock; doctor **extend +5 min**; single red **"Session ended"**
- **Voice & video calls (WebRTC)** with WhatsApp-style UI + **call logs** (Calls tab + inline chat)
- Personalised notifications (by user + role), push-token registration

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| UI | React Native **0.86 (New Architecture)**, React **19**, TypeScript |
| Navigation | React Navigation v7 — native-stack + bottom-tabs |
| State | React Context + reducers (`AuthContext`, `CallContext`, `SessionConfigContext`) |
| HTTP | axios (JWT bearer) |
| Realtime | socket.io-client (websocket + polling fallback) |
| Calls | react-native-webrtc, react-native-incall-manager |
| Voice notes | react-native-nitro-sound |
| Persistence | AsyncStorage (session token only) |
| Responsive | `src/utils/responsive.ts` (`wp/hp/ms/fs`) |
| Icons | react-native-vector-icons (Ionicons/MaterialIcons) + lucide-react-native |

---

## 3. Repository Layout (Frontend)

```
src/
  api/        client.ts (axios+JWT) · config.ts (host discovery) · socket.ts (singleton+events)
  components/ Card/ Call/ CustomAlert/ InputField/ ... (+ index.ts barrel)
  config/     webrtc.ts (fallback ICE, call constraints)
  context/    AuthContext · CallContext · SessionConfigContext · appData.ts (static UI data)
  hooks/      useAutoRefresh.ts
  navigation/ AppNavigator.tsx (stack+tabs) · navigationRef.ts
  screens/    splash|chat|doctor|notification → index.tsx + style.ts
              auth/{login,signup,forgotpassword}/ · patient/{home,chats,calls,doctors,profile}/  (index.tsx+style.ts)
  services/   authService · sessionService · dataService(chatService/callService) · iceService · WebRTCService
  theme/      colors.ts · index.ts (tokens + re-exports responsive API)
  types/      index.ts (domain models)
  utils/      responsive.ts · validation.ts · slots.ts
```

**Screens convention:** every screen folder contains **exactly two files** — `index.tsx`
(logic/component) and `style.ts` (`export const styles = StyleSheet.create({...})`). Import the
screen from its folder (`import HomeScreen from '../screens/patient/home'`).

---

## 4. Frontend Guide

### 4.1 Run
```bash
npm install
# API host: the app discovers it at runtime via GET /api/config → publicUrl.
# Fallback host is in src/api/config.ts (FALLBACK_BASE_URL).
npx react-native run-android       # or: cd android && ./gradlew assembleRelease
npx tsc --noEmit                    # type check
npx eslint src                      # lint
```

### 4.2 Theme & Responsive System
- Central tokens: `Colors` (dark navy), `Spacing`, `Radius`, `Shadows` in `src/theme`.
- `src/utils/responsive.ts` scales from a **390×844** design baseline:
  - `wp(size)` width scaling, `hp(size)` height scaling,
  - `ms(size)` padding/margins/radius (moderate), `fs(size)` font (gentle 0.3),
  - clamped `MIN_SCALE 0.8`–`MAX_SCALE 1.18`, orientation-aware (short/long dimension).
- `src/theme/index.ts` re-exports everything, so screens do:
  `import { Colors, Spacing, wp, ms, fs } from '../../theme';`
- **Rules for new UI:** structure with `flex`/`%`; use `wp/hp/ms/fs` for fixed sizes; keep
  circles round (`width`+`height` both `wp`); never hard-code raw pixels in new styles.

### 4.3 API Client (`src/api/client.ts`, `config.ts`)
- `api` axios instance with `baseURL = getApiBaseUrl()`.
- `loadApiConfig()` fetches `GET {fallback}/api/config` → `publicUrl`, points HTTP+Socket at it.
- Request interceptor adds `Authorization: Bearer <jwt>` (AsyncStorage session).
- 401 clears the session. `extractError` normalises `message`/`error` and **attaches `.status`**.

### 4.4 Services
| Service | Purpose | Real endpoint(s) |
|---|---|---|
| `authService` | login/register/logout/me/profile | `/api/auth/*` |
| `sessionService` | conversations, messages, status, extend, end, doctor availability/requests/slots, notifications, fcm | `/api/conversations…`, `/api/doctor/…`, `/api/notification/…` |
| `dataService.chatService` | list→Chat mapping, peer grouping, send message | wraps `sessionService` |
| `dataService.callService` | **call history** | `GET /api/calls/history` |
| `iceService` | **ICE/TURN credentials** | `POST /api/calls/ice-credentials` (note `/api` prefix!) |
| `WebRTCService` | peer connection lifecycle | (media only) |

### 4.5 Socket.IO (`src/api/socket.ts`)
- Authenticates with JWT via `auth` + `query`. `transports: ['websocket','polling']`.
- Singleton, `connectPromise` guard, re-join rooms + re-register presence on reconnect.
- **Chat events are wrapped** `{ data: {...} }`; **call events are flat**.
- Emits: `addUser`, `join-conversation`, `leave-conversation`, `typing`.
- Forwards data events (`new-message`, `chat-request`, `chat-decision`, `session-timer-update`,
  `session-ended`, `user-joined/left`) → `liveData` so list screens auto-refresh.

**Server → client events (verified contract)**

| Event | Payload | Used by |
|---|---|---|
| `new-message` | `{ data: msg }` | ChatDetail (append, dedupe) |
| `typing` | `{ data: { consultationId, userId, isTyping } }` | ChatDetail indicator |
| `session-timer-update` | `{ data: { consultation_id, state, remainingTime } }` | Chat countdown |
| `session-ended` | `{ data: { consultation_id, state } }` | Red "Session ended" |
| `chat-decision` | `{ data: { consultation_id, status } }` | approve/reschedule/reject notice |
| `schedule-shifted` | `{ data: {...} }` | list refresh |
| `user-online/offline`, `user-joined/left` | `{ data: { userId, online } }` | presence dot |
| `chat-request` | `{ data }` | doctor dashboard refresh |
| **Call (flat):** `call:incoming`, `call:answer`, `call:ice-candidate`, `call:ended`, `call:rejected`, `call:busy`, `call:error` | direct object | CallContext |

### 4.6 Chat Deep-Dive (`screens/chat/index.tsx`)
- Loads conversation + messages; joins room; subscribes sockets (dedupe by id).
- **Send = REST**, **receive = Socket.IO**. Text + media (photo/file/voice) via multipart.
- Media URL: backend-relative → prepend `getApiBaseUrl()`; local pending files played raw.
- Countdown banner logic (pending → "Awaiting approval"; in_progress → starts-in; active →
  remaining; ended → single **red** banner — never both red+yellow).
- **WhatsApp call rows** merged into the thread by timestamp (`displayMessages` memo):
  fetched via `callService.getCallHistory(200)` filtered by `peer_user_id`.
- Header call buttons enabled only when session active.

### 4.7 Voice Notes (`react-native-nitro-sound`)
- Record: `startRecorder()` → `stopRecorder()` returns local path; upload via `sendMedia`.
- Playback: `addPlayBackListener` reports **milliseconds** (÷1000); `startPlayer/pausePlayer/
  resumePlayer/stopPlayer`. Single-tap play via `voiceBusyRef` guard; spinner while preparing;
  **pause → resume from same position**; whole bubble is the touch target.
- Cancel (✕) button is a full-height ~46px target rendered above the timer — **single tap**.

### 4.8 Calls / WebRTC (`context/CallContext.tsx` + `services/WebRTCService.ts`)
**Flow**
1. Caller: `initiateCall(peerId, name, type, consultationId)` → outgoing screen →
   `configureIceForCall()` (best-effort) → `createPeerConnection` → getUserMedia → offer → emit `call:offer`.
2. Backend relays to callee as `call:incoming` → CallContext sets `incoming`, creates PC +
   applies remote offer, resolves the caller name from the conversation, **30s auto-reject**.
3. Callee taps **Accept** → `acceptCall()` (only when `peerReady`) → `createAnswer` → emit `call:answer`.
4. Caller applies answer; both go `active`, ICE connects; media flows.
5. End: `endCall` emits `call:end` (or `call:reject` while ringing / `call:busy` if busy).

**Robustness**
- `call:error` (`unauthorized`/`rate_limited`) → clean reset (no stuck "Calling…").
- `connectionState: 'disconnected'` → **Reconnecting** UI + up to 3× `restartIce()` over ~16s;
  only `failed`/`closed` (or non-recovery) ends the call. `endCall` allowed while reconnecting.
- ICE/TURN config: fetched from `/api/calls/ice-credentials`; applied only when non-empty,
  otherwise STUN fallback in `config/webrtc.ts`. Logs: `[ICE] …`, `[CallContext] ICE config loaded`.

**Known backend contract points (see §5.4):**
- Signaling authorized only when consultation state ∈ `active | in_progress | approved`.
- **Backend bug (fix applied on backend):** `call:answer` must clear the **caller's** ring timer
  (`activeCalls.get(peer).ringTimer`), not the callee's (else answered calls are force-ended
  ~20–22s in, on the answering device).
- No TURN → calls unstable across NAT/CGNAT. Enable backend `config.turn`.

### 4.9 Call Logs (`GET /api/calls/history`)
- Mapping (`dataService.mapCallHistoryRow`): direction `missed` when not answered
  (missed/rejected/failed or no `answeredAt`), else incoming/outgoing; `madeByMe` for alignment;
  duration `"2 min" / "2 min 30 sec"`; **reads both snake_case and camelCase keys**
  (`peer_name` vs `peerName`, `peer_user_id`, `duration_seconds`).
- **Calls tab**: focus auto-refresh.
- **Chat**: call rows inline (type icon + `↑/↓` arrow + duration · time; Missed red ✕).

### 4.10 Notifications
- Real `sessionService.getNotifications()` (`GET /api/notification/all`) + read/delete/fcm.
- Refresh on focus + socket `liveData`.

---

## 5. Backend Guide (Fountain Backend)

> The backend is **Node.js/Express + PostgreSQL (Knex) + Socket.IO**, with chat-message
> **AES-256-GCM encryption** and call state persisted on the **consultations** table.

### 5.1 Environment (subset relevant to calls)
```
NODE_ENV, PORT, DB_*, JWT_SECRET, MESSAGE_ENCRYPTION_KEY
# Socket/CORS
SOCKET_ALLOWED_ORIGINS, SOCKET_ALLOW_WILDCARD_LOCAL
CALL_MAX_OFFERS_PER_MINUTE, CALL_RING_TIMEOUT_MS (default 30000)
# TURN (for reliable calls)
TURN_ENABLED, TURN_HOST, TURN_PORT_UDP/TCP/TLS, TURN_SHARED_SECRET,
TURN_STATIC_USERNAME, TURN_STATIC_CREDENTIALS, TURN_CREDENTIAL_TTL_SECONDS, STUN_HOST
```

### 5.2 REST Endpoints
| Group | Method & path | Notes |
|---|---|---|
| Auth | `POST /api/auth/login · /register · /logout · /forgot-password`, `GET /api/auth/me`, `PUT /api/auth/profile` | JWT `{ user }`; flat envelopes |
| Config | `GET /api/config` | returns `publicUrl` for app host discovery |
| Conversations | `GET/POST /api/conversations` · `GET /api/conversations/doctor/:doctorId/slots/:date` · `PUT /api/conversations/:id/status` (approved/rescheduled/rejected) · `POST|GET /api/conversations/:id/messages` · `PUT /:id/extend` · `PUT /:id/end` | status gate + time-window gate; multipart uploads |
| Shared history | `GET /api/shared-conversation/:id` | read-only decrypted pair thread |
| Doctor | `GET /api/doctor/availability` · `GET /api/doctor/requests` | |
| Notifications | `GET /api/notification/all` · `PUT /read/:id` · `DELETE /delete/:id` · `POST /fcm-token` | |
| **Calls** | `POST /api/calls/ice-credentials` · `GET /api/calls/history` | see §5.4 |

Envelope: success `{ message, data }` (calls history returns `data` array; ice-credentials
returns `{ iceServers, relayAvailable, mode, expiresAt }`). Errors: `{ message }` or `{ error }`.

### 5.3 Session Lifecycle (state machine)
```
pending ──doctor accept──▶ approved ──SessionTimer at scheduled_start──▶ active
  │                            │
  └─reject─▶ rejected          └(active/in_progress) ──at scheduled_end(+grace) or doctor end──▶ ended
```
- Chat opens only inside `scheduled_start → scheduled_end` and when status ∈ `active|in_progress`.
- `SessionTimer`: PostgreSQL `LISTEN/NOTIFY session_update` + 30s backup poll; auto-activates
  due sessions; auto-ends past-end sessions (grace 60s); emits `session-timer-update` / `session-ended`.
- Extension (`PUT /extend`): +N minutes up to a cap; **cascades** later same-day sessions of that
  doctor forward; broadcasts `schedule-shifted`.

### 5.4 Calls Backend
**Signaling** (`helper/socketIo.js`) — verified identity from the JWT (never trust client ids):
- Client → server: `call:offer {to, offer, consultationId, callType}`, `call:answer`,
  `call:ice-candidate`, `call:end`, `call:reject`, `call:busy`.
- Server → client: `call:incoming {from, fromName, callId, consultationId, callType, offer}`,
  `call:answer`, `call:ice-candidate`, `call:ended`, `call:rejected`, `call:busy`, `call:error`.
- Guards: `authorizeCallTarget` (participants + state ∈ active/in_progress/approved), offer rate
  limit, per-user `activeCalls` (single-instance), caller **ring timer** (`ringTimeoutMs`) →
  missed cleanup.
- **Required backend fixes (important):**
  1. `call:answer` → clear **the caller's** timer: `activeCalls.get(peer)?.ringTimer`.
  2. `cleanupCallForUser` → notify **both** sides on server-initiated ends (missed).
  3. Reject offers to **offline** users immediately (`call:error reason:'offline'`).
  4. Enable `config.turn` (coturn REST HMAC or static openrelay) or calls can't survive CGNAT.

**ICE credentials** (`services/CallService/CallService.js`)
- `buildIceServers(userId)` reads `config.turn`; returns STUN + TURN (HMAC `expiry:userId` or
  static creds when `useStaticCredentials`). Empty + `mode:'local'` when TURN disabled.

**Call records** live on the `consultations` table:
`call_id, call_status (ringing|accepted|ended|rejected|missed|failed), call_type,
call_caller_user_id, call_receiver_user_id, call_started_at, call_answered_at,
call_ended_at, call_end_reason`.
`GET /api/calls/history` lists the current user's calls (order `call_started_at` desc, paginated)
with `peer_name/peer_user_id/direction/duration_seconds` computed server-side.
> ⚠️ If this query errors `missing FROM-clause entry for table "doctoruser"`, quote the alias
> references in the `CASE` columns: `"doctorUser"."id"`, `"patientUser"."name"`, etc.

### 5.5 Chat Encryption
- `helper/encryption.js`: AES-256-GCM (`iv:tag:ciphertext`), key from `MESSAGE_ENCRYPTION_KEY`
  (fallback derived from JWT secret), LRU decrypt cache (10k, 5 min TTL).
- Text content encrypted at rest; socket/new-message relays plaintext for the receiver.

---

## 6. Configuration Reference

| Item | Frontend | Backend |
|---|---|---|
| API host | discovered from `GET /api/config → publicUrl`; fallback in `src/api/config.ts` | n/a |
| Socket URL | same host `/socket.io` | `initSocket(server)` |
| TURN/ICE | fetched from `/api/calls/ice-credentials`; STUN fallback in `src/config/webrtc.ts` | `config.turn.*` env |

---

## 7. Known Issues & Fix Log (lessons learned)

| Symptom | Root cause | Fix |
|---|---|---|
| ICE 404 "Url Not exists" | mobile called `/calls/ice-credentials` (no `/api`) | use `/api/calls/ice-credentials` |
| Backend returns TURN but phone got empty array | silent catch + 200-empty (TURN disabled) | diagnostics logs (`[ICE]…`, `[CallContext]…`) + loud warn on 0 servers + 403 status surfaced |
| Caller stuck "Calling…" | no `call:error` handler | added `handleCallError` |
| Call dies ~20–22s on the **answerer** | backend cleared callee (null) ring timer, caller's timer fired | backend fix: clear `activeCalls.get(peer).ringTimer` |
| Calls drop behind CGNAT | STUN-only (no TURN) | enable backend `config.turn` (coturn) |
| Voice needed 3 taps to play | broken local-path URL + tap-restarted download | local-aware URI + `voiceBusyRef` guard + spinner + real pause/resume |
| "Unknown" names / missing chat call rows | backend returns snake_case keys | mapper reads both spellings |
| Double "Session ended" | red countdown + yellow notice both fired | only red (no `sessionNotice('Session ended')`) |
| Cancel (✕) needed many taps | tiny 20px target under the text | full-height ~46px target on top |

---

## 8. Validation Commands
```bash
npx tsc --noEmit          # type check (expect 0 errors)
npx eslint src            # lint (no new errors)
CI=true npx jest --watchman=false   # tests (mocked native modules)
```
