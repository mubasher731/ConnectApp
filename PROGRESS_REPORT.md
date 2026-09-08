# 📈 ConnectApp — Development Progress Report

**Project:** ConnectApp — Healthcare Communication Platform (React Native)
**Reporting Period:** August 1, 2026 – September 8, 2026
**Stack:** React Native 0.86 (New Architecture) · React 19 · TypeScript · React Navigation v7 (native-stack + bottom-tabs) · Socket.IO · react-native-webrtc · react-native-nitro-sound · Reanimated v4
**Backend:** Fountain Backend (Node.js/Express + PostgreSQL/Knex + Socket.IO)

---

## Overview

Built a complete, production-ready healthcare chat + **audio/video calling** platform for
**patients and doctors** — from an empty prototype, through a fully mock/offline demo, to an
**end-to-end integration with the live Fountain Backend** (REST + Socket.IO) with **all mock
data removed**. The final phase added real-time **WebRTC calls**, **WhatsApp-style call logs
(in the Calls tab and inline in chat)**, a **fully responsive design system**, an app-wide
**screens refactor (logic / styles separation)**, and a **comprehensive mock-data audit**.

> Every data path in the app now comes from the live backend. There is **no mock layer** left.

---

## Phase A — App Foundation & Features (Prototype / Mock)

### 1. App Foundation & UI Shell
- **Task:** Design and scaffold a modern, Apple-inspired React Native chat app named **ConnectApp**.
- **Description:** Project structure (screens, components, theme, navigation), an animated **Splash screen**, a **Welcome screen**, and the **Main App** with a **bottom tab bar** (Home, Chats, Calls, Profile).
- **Key Deliverables:** Animated splash/welcome screens, tab navigation with custom branding, central design-token theme (`Colors`, `Spacing`, `Radius`, `Shadows`, `responsiveSize`).
- **Skills:** RN scaffolding, React Navigation (stack + tabs), design-token theming.

### 2. Authentication & Backend Foundation
- **Description:** **Login / Signup / Forgot Password** screens with validation, **JWT session persistence** (AsyncStorage), API client, Socket.IO service, and runtime backend URL discovery (`GET /api/config`).
- **Key Deliverables:** Auth screens + `AuthContext`, token store, REST/socket clients.

### 3. Role-Based Modules (Patient & Doctor)
- **Description:** Separate **Doctor** and **Patient** module folders and screen sets (Doctor Dashboard/Consultations; Patient Home/Chats/Calls/Profile) plus `components/Doctor|Patient`.
- **Key Deliverables:** Role-based routing (native-stack + two tab navigators), organized folders.

### 4–11. Booking, Slot intelligence, Chat history, Notifications, Session alerts, UI polish
Prototype features (booking modal with 15-min slots, slot-lock + availability UX, reusable Card
components, AsyncStorage chat history with session dividers, 5-min pre-session + 1-min extension
alerts, personalized notifications, responsive layouts 280px–560px).

---

## Phase B — Live Backend Integration (Fountain Backend)

### 12. Full Real-Backend Integration & Mock Removal
- **Description:** Rewrote the data layer to the real contract — **conversations**, **messages**, **status/extend/end**, **doctor availability/requests/slots**, **notifications**, role auth (`role_id 3 = Doctor`, `4 = Patient`), flat `{ message, data }` envelope. Deleted the entire `src/mock/` layer and mock session/notification stores.
- **Key Deliverables:** `sessionService`, `dataService` (conversation → chat mapping, `peer_user_id` presence, peer grouping, one row per pair), real booking + doctor Accept/Reject, real notifications.

### 13. Real-Time Chat & Socket Layer
- **Description:** Fixed the socket to authenticate with the JWT (**auth + query handshake**), `transports: ['websocket','polling']` (**polling fallback required** over ngrok/proxies), and matched the verified event contract (`join-conversation`, `new-message`, `typing`, `session-timer-update`, `session-ended`, `chat-decision`, `schedule-shifted`, `user-online/offline`, `user-joined/left`, `chat-request`). Chat payloads are wrapped in `{ data: {...} }`. Added room re-join on reconnect, presence, typing indicator, and **auto-refresh** for list screens (`useAutoRefresh` + focus polling).
- **Key Deliverables:** Authenticated socket singleton + re-register on reconnect, `liveData` emitter, presence (online/offline dot), typing indicator.

### 14. Booking & Doctor Workflow on the Live Backend
- **Description:** Booking allows **future dates** with past slots disabled, requires the backend's **3–5 word reason**, and surfaces **real backend errors**. Pending conversations show **"Awaiting doctor approval"** (locked); countdown only once `in_progress`/`active`. Doctor Dashboard handles pending **Appointment Requests** (Accept/Reject/Reschedule) with real-time refresh.
- **Key Deliverables:** Date + slot picker, pending-state banner/lock, dashboard request flow, real error surfacing.

### 15. Media, Session Divider & Final Polish (Live)
- **Description:** **Photo/file/voice** rendering (base-URL prepend, image/file/voice chips) + **multipart send**; **"New session" divider**; chat list grouped by peer; full participant names in header; WhatsApp-style countdown & lifecycle banners.

---

## Phase C — Real-Time Audio/Video Calls (WebRTC) + Hardening

### 16. End-to-End WebRTC Calls (Signal + Media)
- **Description:** Implemented **voice & video calls** over react-native-webrtc with backend-relayed Socket.IO signaling (`call:offer → call:incoming`, `call:answer`, `call:ice-candidate`, `call:end → call:ended`, `call:reject → call:rejected`, `call:busy`), routed by real `users.id` via `peer_user_id`. WhatsApp-style **incoming call UI** (slide-up accept/decline), in-call screen with PiP local preview + **camera switch**, `InCallManager` audio routing, connection-quality indicator, 30s ring auto-reject.
- **Key fixes along the way:**
  - Caller name resolution from the conversation (`doctor_name`/`patient_name`) instead of "Unknown".
  - **Socket race / call-delivery regression** — connect() reuses `socket.connected || socket.active` with a `connectPromise` guard; call listeners re-register on `user?.id` + socket reconnect.
  - `peerReady` gating so an answer is only created after the remote offer is applied.
  - Double-end guard, InCallManager start/stop lifecycle guard, camera-switch freeze fix (brand-new `MediaStream` + release track before re-acquire).
- **Skills:** WebRTC peer-connection state machine, Socket.IO signaling, media/camera handling.

### 17. WebRTC Backend/Contract Alignment (Frontend)
- **Description:** Found & fixed the real ICE endpoint path — the mobile was calling `/calls/ice-credentials` instead of `/api/calls/ice-credentials` (404 "Url Not exists"); the endpoint **exists** and returns TURN. ICE fetch is now **best-effort** (`configureIceForCall`) with loud diagnostics (`[ICE] OK/FAILED` host/status logs, `[CallContext] ICE config loaded`).
- Added **`call:error` handling** (`unauthorized`/`rate_limited`) so a rejected offer no longer leaves the caller stuck on "Calling…".
- `extractError` now preserves the **HTTP status** on errors for diagnosis.

### 18. Call Resilience & Diagnostics
- **Description:** Graceful **disconnect handling** — `connectionState: 'disconnected'` is no longer an instant hang-up; the call goes to **"Reconnecting…"**, retries `restartIce()` (up to 3× over ~16s), and only ends on `failed`/`closed` or if recovery never happens. `endCall` works while reconnecting. Added candidate diagnostics (`Remote candidate type: host/srflx/relay`) via `getStats`.
- **Backend bug identified for the fix:** `socketIo.js call:answer` was clearing the **callee's** ring timer (which is null) instead of the **caller's** — the caller's "missed" timer fired ~20s after a successful answer and force-ended the call **on the answering device**. Fix = clear `activeCalls.get(peer).ringTimer` and notify both sides on cleanup.

### 19. WhatsApp-style Call Logs (History UI)
- **Description:** Wired the UI to the real **`GET /api/calls/history`** endpoint:
  - **Calls tab** — real list (avatar, name, direction, duration, relative time, call-type icon) with focus auto-refresh.
  - **Inline in chat** — call rows merged into the thread by timestamp (like WhatsApp): green right bubble for outgoing, grey left for incoming, red ✕ for **Missed**, with `↑/↓` arrow + `duration · time`.
- **Key fixes:** backend returns **snake_case** keys (`peer_name`, `peer_user_id`, `duration_seconds`) alongside camelCase — mapper now reads both, fixing **"Unknown" names**, missing chat rows, and durations. Missed/rejected/failed collapse to "Missed" (WhatsApp behavior). Duration shown only for answered calls.

---

## Phase D — Cross-Cutting Polish, Responsive System, Cleanup

### 20. Responsive Design System (all devices + orientation)
- **Description:** Created a single-source **`src/utils/responsive.ts`** with `wp/hp/ms/fs` scaling from a **390×844** design baseline with clamped factors (`MIN 0.8 / MAX 1.18`, orientation-aware short/long dimension) — replacing raw `react-native-size-matters` (fixed 350×680, unbounded → distorted on wide screens). The **theme barrel re-exports** the whole API, and **all 38 styled files** were converted (widths→`wp`, heights→`hp`, padding/margin/radius→`ms`, fonts→`fs`), with circular controls kept round (`wp` for both axes). Added `deviceWidth/Height`, `isTablet`.
- **Key Deliverables:** Responsive utility + theme, full codebase conversion, tablet/small-phone/landscape-safe clamps.

### 21. Voice Recording & Playback Fixes (nitro-sound)
- **Description:** Fixed voice notes:
  - **"3 presses to play"** — just-sent notes used a local recorder path that got mangled into a broken API URL; remote notes cancelled/restarted their download on every extra tap. Now: local-file-aware URI resolution (only pending `local-` ids play raw), a `voiceBusyRef` in-flight guard, a loading spinner, and **real pause → resume** from the same position.
  - **Cancel (✕) now single-tap** — enlarged the recording cancel target to a full-height ~46px area and rendered it above the timer text.

### 22. Screen Structure Refactor (index.tsx + style.ts)
- **Description:** Standardized `src/screens` so **every screen folder has exactly two files**:
  - `splash`, `chat`, `doctor`, `notification` → `index.tsx` + `style.ts`
  - `auth/{login,signup,forgotpassword}` and `patient/{home,chats,calls,doctors,profile}` → each with `index.tsx` + `style.ts`
  - Single import site `AppNavigator.tsx`; relative depths fixed; all screens verified with `tsc` + `eslint`.

### 23. Mock-Data Audit & Removal
- **Description:** Removed every remaining mock/stub so **all data comes from the backend**:
  - Deleted `services/userService.ts` (returned `[]`) and the unreachable `DirectoryScreen.tsx` that depended on it.
  - Removed the `notificationService` stub (empty/no-op) — notifications use the real `sessionService.getNotifications()`.
  - Removed the stale `isMock` type field and the unused `DOCTOR_DEMO_CREDENTIALS`.
  - Final grep: no `mock`/stub references left in `src`.

### 24. Misc UI/Bug Fixes (Chat)
- **Double "Session ended"** banner fixed — the red countdown banner is the only one; the yellow `sessionNotice` duplicate was removed on session end.
- `HomeScreen` pre-existing wrong `sessionService` import (from `dataService`) fixed → services barrel.
- TS cleanup in `WebRTCService.ts` (local `Init` type declarations), `tsc`-clean project.

---

## Summary of Deliverables (Key Files — Final Structure)

| Area | Deliverable |
|---|---|
| API | `src/api/config.ts` (host discovery via `/api/config` + fallback), `client.ts` (axios + JWT + `extractError` w/ status), `socket.ts` (auth socket, event contract, `liveData`) |
| Services | `sessionService` (conversations/messages/status/extend/end/availability/notifications), `dataService` (`chatService`, `callService` → `/api/calls/history`), `iceService` (`/api/calls/ice-credentials`) |
| Calls/WebRTC | `WebRTCService.ts`, `context/CallContext.tsx`, `components/Call/*` (CallScreen, CallControls, IncomingCallModal), ICE diagnostics + graceful reconnect |
| Screens (refactored) | `screens/{splash,chat,doctor,notification}/index.tsx+style.ts`, `screens/auth/{login,signup,forgotpassword}/…`, `screens/patient/{home,chats,calls,doctors,profile}/…` |
| Chat | media/voice rendering, WhatsApp call rows inline, session divider, single red "Session ended", single-tap recording cancel |
| Theme/Responsive | `utils/responsive.ts` (390×844, clamped wp/hp/ms/fs), theme barrel re-exports |
| Backend findings | `/api/calls/ice-credentials` path fix, ICE/TURN config (config.turn), `call:answer` ring-timer bug, call-history SQL quoting bug |

## Validation
- `npx tsc --noEmit` → **0 errors**
- `npx eslint src` → **0 new errors** (only pre-existing chat `useCallback` dependency debt resolved)
- Jest suite passes for mocked modules (vector-icons, nitro-sound, image-picker, documents-picker, reanimated).

## Skills Gained — Overall
- React Native & React 19 (hooks, contexts, state machines) · TypeScript architecture · React Navigation v7
- REST + Socket.IO real-time with a live backend · **WebRTC audio/video calling + signaling + NAT/ICE/TURN**
- Responsive design systems · WhatsApp-style chat/call UX · mock-to-real migration & cleanup
- Backend contract analysis (endpoints, events, encryption, session lifecycle, call records)
- Code quality: `tsc` / `eslint` / `jest` discipline
