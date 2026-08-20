# 🔍 Backend ↔ Frontend Verification — Revised API Reference (v2)

**Date:** Aug 20, 2026
**Reference verified:** The revised Fountain-backend Doctor–Patient Chat API (flat `{ message, data }` envelope, role_ids 1/2/4).

> ⚠️ **Note on the envelope:** The previous API doc you shared used `{ statusCode, response: { status, code, message, data } }`. This revised doc uses a **flat `{ message, data }`** envelope (auth = flat `{ message, token, user }`). Confirm which is canonical — it changes how the frontend unwraps responses. (The frontend currently unwraps `res.data.data`, which matches the **revised** flat envelope.)

---

## ✅ What Matches (revised reference)

| Backend contract | Frontend state | Status |
|---|---|---|
| Bearer-token auth on all endpoints | `api` client auto-attaches `Authorization: Bearer <token>` | ✅ |
| Response envelope `{ message, data }` | Frontend unwraps `res.data.data` (data) / `res.data` (auth) | ✅ |
| Error codes 400/401/403/404/500 | 401 clears session; messages surfaced | ✅ |
| Messages have `status: sent\|read` + `role` | Frontend `Message` uses `isRead`/`sentByMe` (mappable) | ✅ |
| AES-256-GCM encryption (decrypted for participants) | Frontend renders plain `content` | ✅ |
| Session lifecycle (pending→in_progress→active→ended, auto-flip, doctor end/extend +5min max 30) | Mock session engine (countdown, extension alert) | ✅ Conceptually |
| Doctor-only decisions (approve/reject/reschedule/end/extend) | Doctor Dashboard Accept/Reject + extension alert | ✅ Conceptually |
| Real-time events for messages/decisions/session | Frontend socket layer | ⚠️ Event names differ (below) |

---

## 🚨 Critical Frontend Mismatches (this revision)

### 1. Role ID for Doctor changed: **3 → 2**
The new backend assigns doctors `role_id: 2` (patients `4`, admin `1`). The frontend **hardcodes `role_id === 3`** for "is doctor" in **8 places**:
`src/api/socket.ts`, `src/components/Card/UserDirectoryCard.tsx`, `src/context/MockSessionProvider.tsx`, `src/mock/doctors.ts`, `src/navigation/AppNavigator.tsx`, `src/screens/chat/ChatDetailScreen.tsx` (×2), `src/screens/patient/ProfileScreen.tsx`, `src/services/dataService.ts` (×2).

**→ All must change to `role_id === 2`**, or the whole doctor experience (tabs, socket role, chat) breaks.

### 2. Auth endpoints
Frontend uses `/api/auth/login · register · me · profile · logout · forgot-password`.
New backend exposes role-specific **`/api/patient/login`, `/api/doctor/login`, `/api/admin/login`**.
- **Mismatch:** login must route by role.
- **Not in this reference:** register, `/api/auth/me`, profile update, logout, forgot-password — confirm they exist.

### 3. Chat / session endpoints (frontend uses the OLD paths)
| Frontend service | Current path | Revised backend | Action |
|---|---|---|---|
| Chat list (patient) | `GET /api/patient/sessions` | `GET /api/chat/conversations` | Change |
| Chat list (doctor) | `GET /api/doctor/sessions` | `GET /api/chat/conversations` | Change |
| Get messages | `GET /api/sessions/:id/messages` | `GET /api/message/:conversationId` | Change |
| Send message | `POST /api/sessions/:id/message` | `POST /api/message/send/:conversationId` | Change (both roles use POST) |
| Join session | `POST /api/sessions/:id/join` | (auto via SessionTimer + `join-conversation`) | Remove |
| Mark read | `POST /api/sessions/:id/read` | **Not in reference** | Backend gap |
| Single session | `GET /api/sessions/:id` | **No single endpoint in reference** | Backend gap |

### 4. Session / conversation model
- New conversation shape: `{ id, appointment_id, doctor_id, patient_id, state, scheduled_start, actual_start, actual_end, messages }`
- `state`: `pending → in_progress → active → ended`
- Frontend `Session`/`Chat` use `status` (`scheduled|active|completed|missed`) and `duration_minutes` → **mapping must be rewritten** to the conversation shape.

### 5. Socket events (frontend ↔ new backend)
| Frontend emits/listens | Revised backend |
|---|---|
| `joinSession` / `leaveSession` | `join-conversation` / `leave-conversation` |
| `sessionMessage` | `message-received` |
| `sessionStarted/Ending/Ended/Missed` | `session-ended`, `session-extended` (no start/timer events in v2) |
| `typing` + `typingStopped` | `typing { conversationId, isTyping }` (single boolean event) |
| `userPresence` (online/offline) | `user-joined` / `user-left` (derive presence from these) |
| — | `request-decision` (client) / `request-updated` (server) for doctor decisions |

---

## 🟥 MISSING IN THE FRONTEND (to fully use this backend)

1. **role_id update (3 → 2)** for "is doctor" everywhere (8 files).
2. **Rewire `sessionService`** to `GET /api/chat/conversations`, `GET /api/message/:id`, `POST /api/message/send/:id`; delete `/join`.
3. **Wire the Doctors screen** to the patient doctor-directory endpoint (currently `MOCK_DOCTOR_PROFILES`).
4. **Wire the booking modal** to `POST /api/chat/request` (`{ doctor_id, date, time_slot, reason, patient_id }`), keeping the 10s availability check but against real slots.
5. **Change the slot model** to match the backend: **date + `HH:MM` time slots (30-min sessions)**, not the current daily 15-min generic list.
6. **Wire Doctor Dashboard requests** to `GET /api/doctor/requests` and Accept/Reject to `POST /api/doctor/approve/:requestId` / `reject/:requestId`.
7. **Add Reschedule UI** (doctor picks `new_date` + `new_time_slot`) → `POST /api/doctor/reschedule/:requestId`.
8. **Wire session controls:** `POST /api/doctor/extend-session/:conversationId` (enforce 30-min max) and `POST /api/doctor/end-session/:conversationId`.
9. **Update the socket layer** to the revised event names (join-conversation, message-received, request-decision/request-updated, session-extended, user-joined/user-left, boolean typing).
10. **Map conversation `state`/timestamps** into the chat UI and countdown (use `actual_start` / `scheduled_end`).
11. **Media attachments UI** — backend accepts `type: photo|file|voice` + `media_url`; the composer sends text only.
12. **Render media messages** (`media_url` for photo/file/voice) in the chat bubble.
13. **Admin module** — backend has admin endpoints (login, doctors, appointments, users, onboard doctor); the app has **no admin screens**.

---

## 🟦 MISSING IN THE BACKEND (for the frontend screens to work fully)

1. **Patient-facing doctor directory / availability endpoint** — the Doctors screen needs a list of doctors with their weekly slots. The revised reference only has **admin** `GET /api/admin/doctors` (and the patient-facing `GET /api/doctor/availability` from the *previous* doc is gone).
2. **Read-only shared conversation history endpoint** — the "Previous Sessions — read only" feature needs it (previous doc had `GET /api/shared-conversation/:id`; this one doesn't).
3. **Mark-messages-as-read endpoint** — the backend returns `status: "read"` but there's no way for the client to set it (frontend had `POST /api/sessions/:id/read`).
4. **Notifications endpoints** — the Notifications screen needs `GET /api/notifications` + mark-all-read. This reference only covers email + socket `request-updated`; no notifications API.
5. **Call history endpoint** — the Calls screen needs `GET /api/calls` (voice/video history); none exists.
6. **User directory endpoint** — the Directory (start-chat by role) screen needs `GET /api/users?role=...`; only admin `GET /api/admin/users` exists.
7. **Real-time session-timer event** — the previous doc had `session-timer-update` for live countdown sync; the revised socket list has none (only `session-ended`/`session-extended`). The frontend countdown would rely on local timers only.
8. **Online/offline presence** — only `user-joined`/`user-left` exist; no general presence/online status event (frontend header shows online/offline).
9. **Auth endpoints not listed** — `/api/auth/register`, `/api/auth/me`, profile update, logout, forgot-password (frontend depends on these).
10. **Single conversation fetch** — no `GET /api/conversations/:id` (only the list). Useful for opening a specific chat from a notification.

---

## 🧭 Recommended Order of Work
1. Frontend: **role_id 3 → 2** + **rewire chat endpoints** (biggest correctness win).
2. Backend: add **patient doctor-directory**, **shared history**, **notifications**, **call history** endpoints.
3. Frontend: wire **booking → /api/chat/request**, **doctor approve/reject/reschedule/end/extend**, **socket event renames**.
4. Frontend: **slot model** to date + 30-min slots; add **media** + **admin** (if in scope).
