# Fountain Session Feature — Frontend Integration Guide

A complete spec for integrating the **15-minute chat session** feature into the Fountain Backend from frontend clients (React Native patient app, Next.js doctor web app, Next.js admin dashboard).

---

## 1. Server Overview

| Property | Value |
|----------|-------|
| **Base URL** | `http://localhost:5002` (local dev) / your ngrok/public URL for external access |
| **API Prefix** | `/api` |
| **Auth** | Bearer JWT in `Authorization` header |
| **Real-time** | Socket.IO v4 (`socket.io-client`) on the same origin |
| **Session duration** | Fixed 15 minutes (configurable per session) |
| **Timer** | Durable — runs a 15-second tick backed by PostgreSQL `notified_events` flags (survives restarts) |

### Discovering the Public URL Automatically
When the backend is exposed via ngrok (or any reverse proxy), the public URL is available at runtime via:

```
GET /api/config
```

#### Response
```json
{
  "publicUrl": "https://nonrefractional-superradically-emiko.ngrok-free.dev",
  "socketPath": "/socket.io/"
}
```

**Frontend should call this first** to determine the base URL for both HTTP requests and Socket.IO connections:
```javascript
const { publicUrl } = await fetch("https://<ngrok-or-localhost-5002>/api/config").then(r => r.json());
const API_BASE = `${publicUrl}/api`;
```
Set `PUBLIC_URL` in `.env` to update the value returned here without code changes. See `PUBLIC_URL_GUIDE.md` for workflow details.

### Full base URLs
```
Local development: http://localhost:5002
Ngrok (current):   https://nonrefractional-superradically-emiko.ngrok-free.dev
Production:        https://your-domain.com (replace with actual)
```

---

## 2. Getting the Public URL (for ngrok setups)

When accessing the backend over ngrok (or any dynamic public URL), **call this first** before making any other API calls:

### GET /api/config

Returns the current public URL to use for all API calls and Socket.IO connections.

#### Response (200)
```json
{
  "publicUrl": "https://nonrefractional-superradically-emiko.ngrok-free.dev",
  "socketPath": "/socket.io/"
}
```

**Frontend usage:**
```javascript
// Discover the base URL dynamically
const res = await fetch("https://<localhost-5002-or-ngrok>/api/config");
const { publicUrl } = await res.json();
const API_BASE = `${publicUrl}/api`;

// Use API_BASE for all HTTP requests
// Use publicUrl for the Socket.IO server address
```

> Update the `PUBLIC_URL` environment variable in `.env` to change the URL returned here. See `PUBLIC_URL_GUIDE.md` for the full workflow.

---

## 3. Authentication

All session routes require a valid JWT. Obtain a token via login.

### POST /api/auth/login

Authenticates a user and returns a JWT + user object.

#### Request
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@fountain.com",
  "password": "Admin@123"
}
```

#### Response (200)
```json
{
  "message": "Login Successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "role_id": 2,
    "name": "Admin User",
    "email": "admin@fountain.com",
    "email_verified": true,
    "google_id": null,
    "avatar": null,
    "status": "active",
    "session_id": "uuid-v4-string",
    "is_profile_completed": true,
    "created_at": "2026-08-07T10:33:01.960Z",
    "updated_at": "2026-08-10T07:51:18.887Z",
    "deleted_at": null,
    "mood": false
  }
}
```

### Authorization Headers
All subsequent requests include:
```
Authorization: Bearer <token from login>
Content-Type: application/json
```

### Role IDs

| role_id | Role |
|---------|------|
| 2 | Admin |
| 3 | Doctor |
| 4 | Patient |

> **Important:** The token's `session_id` is rotated on each login. A previously issued token becomes invalid. Always use the latest token.

### Auth Middleware Behavior
The auth middleware (`src/middlewares/auth.js`) verifies the JWT signature, loads the user from the `users` table, and compares `user.session_id` with `decoded.user.session_id`. If they don't match (e.g., user logged in elsewhere), returns **401 Unauthorized**.

---

## 4. Socket.IO Integration

Socket.IO is initialized automatically when the server starts. Clients connect to the same host/port as the API.

### Connection setup
Use the `publicUrl` from `GET /api/config` to support ngrok/dynamic hosts:
```javascript
// 1. Discover the public URL first (see Section 2)
//    const { publicUrl } = await fetch(`${BASE}/api/config`).then(r => r.json());

// 2. Connect Socket.IO to the public URL
import { io } from "socket.io-client";

const socket = io(publicUrl, {  // e.g. "https://your-ngrok-url.ngrok-free.dev"
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ["websocket", "polling"],
});

// After login, register your socket under your user id
socket.emit("addUser", userId);

// Join a session room to receive real-time events
socket.on("connect", () => {
  socket.emit("joinSession", sessionId);
});
```

### Socket Events You MUST handle

#### Client → Server
| Event | Payload | Purpose |
|-------|---------|---------|
| `addUser` | `{ userId: number }` | Register socket to user for direct notifications |
| `joinSession` | `{ sessionId: number }` | Join the room to receive session events + messages |
| `leaveSession` | `{ sessionId: number }` | Leave the room (e.g., on unmount) |
| `typing` | `{ sessionId, userId, userRole }` | Signal typing to other participants |

#### Server → Client
| Event | Payload | When it fires |
|-------|---------|--------------|
| `sessionScheduled` | `{ sessionId, scheduledStart, appointmentId }` | Admin creates a session for your appointment |
| `sessionStarting` | `{ sessionId, minutesUntil: 5 }` | 5 minutes before scheduled start |
| `sessionStarted` | `{ sessionId, actualStart, durationMinutes }` | Session becomes active (after first join) |
| `sessionMessage` | `{ sessionId, message: { id, sender_id, sender_role, message_text, message_type, sent_at } }` | New message received |
| `sessionEnding` | `{ sessionId, minutesRemaining: 1 }` | 1 minute before end |
| `sessionEnded` | `{ sessionId, actualEnd, duration }` | Session auto-completed |
| `sessionMissed` | `{ sessionId, actualEnd, reason }` | Nobody joined within 5 min of start |
| `userJoined` | `{ sessionId, userId, userRole }` | Participant joined (socket room) |
| `typing` | `{ userId, userRole }` | Other participant is typing |

### Optional socketId in HTTP join
After connecting a socket, capture `socket.id` and pass it to the HTTP `/join` endpoint so the server attaches your socket to the correct session room:
- **Option A (header):** `x-socket-id: <your-socket-id>`
- **Option B (body):** `{ "socketId": "<your-socket-id>" }`

If you omit the socketId, the HTTP join still works — you just won't receive real-time socket events for that session from the server side (you can still manage rooms yourself via `joinSession` event).

---

## 5. Admin API (Next.js Dashboard Modal)

### POST /api/admin/appointments/:id/start-session

Creates a 15-minute chat session for an appointment. **Admin only** (role_id 2).

#### Path Parameters
| Param | Type | Description |
|-------|------|-------------|
| `:id` | integer | The appointment ID (used in URL, not body) |

#### Request
```
POST /api/admin/appointments/:appointment_id/start-session
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "appointment_id": 100,
  "patient_id": 3,
  "doctor_id": 2,
  "scheduled_start": "2026-08-15T14:00:00Z",
  "duration_minutes": 15
}
```

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `appointment_id` | integer | ✅ | — | Must not already have a session |
| `patient_id` | integer | ✅ | — | The patient's **users.id** |
| `doctor_id` | integer | ✅ | — | The doctor's **users.id** (NOT doctors.id) |
| `scheduled_start` | ISO datetime | ✅ | — | UTC format: `YYYY-MM-DDTHH:MM:SSZ` |
| `duration_minutes` | integer | ❌ | 15 | 1–120 |

#### Response (201)
```json
{
  "status": true,
  "code": 201,
  "message": "Session created successfully",
  "data": {
    "id": 2,
    "appointment_id": 100,
    "patient_id": 3,
    "doctor_id": 2,
    "scheduled_start": "2026-08-15T14:00:00.000Z",
    "actual_start": null,
    "actual_end": null,
    "duration_minutes": 15,
    "status": "scheduled",
    "created_at": "2026-08-10T08:01:22.294Z",
    "updated_at": "2026-08-10T08:01:22.294Z",
    "notified_events": []
  }
}
```

#### Error Responses
| Code | Message | Cause |
|------|---------|-------|
| 400 | "appointment_id and scheduled_start are required" | Missing fields |
| 400 | "patient_id and doctor_id are required" | Missing participant ids |
| 400 | "Session already exists for this appointment" | Appointment already has a session |
| 401 | "Unauthorized" | Missing/invalid token |
| 403 | "Forbidden: Admin access required" | Not an admin |

---

## 6. Patient API (React Native App)

All routes require a valid patient JWT (role_id 4).

### GET /api/patient/sessions
Lists all sessions for the authenticated patient.

#### Request
```
GET /api/patient/sessions?limit=10&page=1
Authorization: Bearer <patient_token>
```

| Query Param | Type | Default | Max |
|-------------|------|---------|-----|
| `limit` | integer | 10 | 100 |
| `page` | integer | 1 | — |

#### Response (200)
```json
{
  "status": true,
  "code": 200,
  "message": "Sessions retrieved successfully",
  "data": {
    "sessions": [
      {
        "id": 2,
        "appointment_id": 100,
        "patient_id": 3,
        "doctor_id": 2,
        "scheduled_start": "2026-08-15T15:00:00.000Z",
        "actual_start": null,
        "actual_end": null,
        "duration_minutes": 15,
        "status": "scheduled",
        "notified_events": [],
        "appointment_date": "2026-08-14T19:00:00.000Z",
        "appointment_time_slot": "15:00-16:00",
        "doctor_name": "Dr. John Smith",
        "created_at": "2026-08-10T08:01:22.294Z",
        "updated_at": "2026-08-10T08:01:22.294Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

Session statuses you'll see:
| Status | Meaning |
|--------|---------|
| `scheduled` | Session created, not yet started |
| `active` | At least one participant has joined |
| `completed` | Session reached its scheduled end |
| `missed` | Nobody joined within 5 min of start |

---

## 7. Doctor API (Next.js Web App)

### GET /api/doctor/sessions
Lists all sessions for the authenticated doctor. Identical structure to the patient endpoint but filters by `doctor_id` and includes `patient_name`.

#### Request
```
GET /api/doctor/sessions?limit=10&page=1
Authorization: Bearer <doctor_token>
```

#### Response
Same structure as patient sessions, with `patient_name` instead of `doctor_name`.

---

## 8. Shared Session API (Patient + Doctor)

Both participants can use these endpoints on any session they're part of.

### GET /api/sessions/:sessionId
Get session details.

#### Request
```
GET /api/sessions/:sessionId
Authorization: Bearer <participant_token>
```

#### Response (200)
```json
{
  "status": true,
  "code": 200,
  "message": "Session retrieved successfully",
  "data": {
    "id": 5,
    "appointment_id": 300,
    "patient_id": 3,
    "doctor_id": 2,
    "scheduled_start": "2026-08-10T08:39:03.000Z",
    "actual_start": "2026-08-10T08:39:08.379Z",
    "actual_end": "2026-08-10T08:40:16.100Z",
    "duration_minutes": 1,
    "status": "completed",
    "notified_events": ["started", "ended"],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

#### Error
| Code | Message | Cause |
|------|---------|-------|
| 403 | "Not authorized to view this session" | You're neither patient nor doctor nor admin |
| 404 | "Session not found" | Invalid session ID |

### POST /api/sessions/:sessionId/join
Join the session (transition to active). Available from 5 minutes before `scheduled_start` until the session is `completed`/`missed`.

#### Request
```
POST /api/sessions/:sessionId/join
Authorization: Bearer <participant_token>
Content-Type: application/json

{
  "socketId": "optional-socket-id-from-client"
}
```

The `socketId` is optional. If provided, the server joins that socket to the session room and emits `userJoined`.

#### Response (200)
```json
{
  "status": true,
  "code": 200,
  "message": "Joined session successfully",
  "data": {
    "session_id": "5",
    "status": "active",
    "actual_start": "2026-08-10T08:39:08.379Z",
    "scheduled_end": "2026-08-10T08:40:03.000Z"
  }
}
```

| Field | Description |
|-------|-------------|
| `session_id` | The session you joined |
| `status` | `"active"` (now that you've joined) |
| `actual_start` | When the session actually started |
| `scheduled_end` | Exact UTC time the session will auto-close |

#### Error
| Code | Message | Cause |
|------|---------|-------|
| 400 | "Session not yet open for joining" | More than 5 min before scheduled_start |
| 400 | "Session has already ended" | Status is completed/missed |
| 403 | "Not authorized to join this session" | You're not a participant |

### POST /api/sessions/:sessionId/message
Send a message in the session. Session must be **active** and within the time window `[scheduled_start, scheduled_end]`.

#### Request
```
POST /api/sessions/:sessionId/message
Authorization: Bearer <participant_token>
Content-Type: application/json

{
  "message_text": "Hello from patient!",
  "message_type": "text"
}
```

| Field | Type | Required | Default | Allowed values |
|-------|------|----------|---------|----------------|
| `message_text` | string | ✅ | — | Max 5000 chars |
| `message_type` | string | ❌ | text | `text`, `file`, `system` |

#### Response (201)
```json
{
  "status": true,
  "code": 201,
  "message": "Message sent successfully",
  "data": {
    "id": 4,
    "session_id": 5,
    "sender_id": 3,
    "sender_role": "patient",
    "message_text": "Hello from patient!",
    "message_type": "text",
    "sent_at": "2026-08-10T08:39:08.996Z",
    "is_read": false,
    "read_at": null
  }
}
```

> The message is persisted to PostgreSQL. If a Socket.IO client is connected to the session room, they receive a `sessionMessage` event in real time. If no socket clients are connected, the message is still saved successfully.

#### Error
| Code | Message | Cause |
|------|---------|-------|
| 400 | "message_text is required" | Empty/missing text |
| 400 | "Session is not active" | Someone hasn't joined yet |
| 400 | "Session time window has passed" | Outside scheduled window |
| 403 | "Not authorized to send messages in this session" | Not a participant |

### GET /api/sessions/:sessionId/messages
Get paginated message history.

#### Request
```
GET /api/sessions/:sessionId/messages?page=1&limit=50
Authorization: Bearer <participant_token>
```

| Query Param | Type | Default | Max |
|-------------|------|---------|-----|
| `limit` | integer | 50 | 100 |
| `page` | integer | 1 | — |

#### Response (200)
```json
{
  "status": true,
  "code": 200,
  "message": "Messages retrieved successfully",
  "data": {
    "messages": [
      {
        "id": 4,
        "session_id": 5,
        "sender_id": 3,
        "sender_role": "patient",
        "message_text": "Hello from patient, Dr. Smith!",
        "message_type": "text",
        "sent_at": "2026-08-10T08:39:08.996Z",
        "is_read": false,
        "read_at": null
      }
    ],
    "pagination": {
      "total": 2,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    }
  }
}
```

Messages are ordered by `sent_at` ascending (oldest first).

### POST /api/sessions/:sessionId/read
Mark all messages sent by the OTHER participant as read.

#### Request
```
POST /api/sessions/:sessionId/read
Authorization: Bearer <participant_token>
Content-Type: application/json
```

#### Response (200)
```json
{
  "status": true,
  "code": 200,
  "message": "Messages marked as read",
  "data": {}
}
```

---

## 9. Session Lifecycle & Timer Behavior

The session timer is a **background service** that ticks every 15 seconds, checking all `scheduled`/`active` sessions in the database. It uses idempotent flags (`notified_events` JSON column) so it's safe to restart the server at any time without losing state or sending duplicate events.

```
              ┌─────────────┐
              │  SCHEDULED  │
              └──────┬──────┘
                     │ 5 min before start
                     ▼
           [sessionStarting event]
                     │ at scheduled_start
                     ▼
              ┌─────────────┐
   participant│   ACTIVE    │
     joins    │             │
   (sets      └──────┬──────┘
   actual_start)      │ 1 min before end
                     ▼
           [sessionEnding event]
                     │ at scheduled_end
                     ▼
              ┌─────────────┐
              │ COMPLETED   │
              └─────────────┘
           [sessionEnded event]

   No participant joins
   within 5 min of start:
                     │
                     ▼
              ┌─────────────┐
              │ MISSION     │
              └─────────────┘
           [sessionMissed + appointment marked missed]
```

### What each event means for your frontend
| Event | Action for client |
|-------|-------------------|
| `sessionStarting` | Show "Session starting in 5 minutes" banner |
| `sessionStarted` | Enable chat UI, show "Session started" |
| `sessionEnding` | Show "Session ends in 1 minute" warning |
| `sessionEnded` | Disable chat, show "Session ended", archive view |
| `sessionMissed` | Show "Session missed — neither party joined" |
| `sessionScheduled` | Notify patient/doctor of upcoming session |
| `sessionMessage` | Add message to chat list (append to existing) |
| `userJoined` | Show "Dr. Smith joined the call" type notification |

### Missed session logic
- If **nobody** joins within **5 minutes** of `scheduled_start`, the session is marked `missed`
- The linked appointment's status is also updated to `missed` in the `appointments` table
- A `sessionMissed` Socket.IO event is emitted to the session room (if anyone is connected)

### Auto-completion
- Exactly at `scheduled_start + duration_minutes`, the session status becomes `completed`
- `sessionEnded` event is emitted
- The socket room is cleaned up server-side

---

## 10. Test Credentials

Use these for development/testing only.

| Email | Password | Role | User ID |
|-------|----------|------|---------|
| admin@fountain.com | Admin@123 | Admin | 1 |
| doctor@fountain.com | Admin@123 | Doctor | 2 |
| patient@fountain.com | Admin@123 | Patient | 3 |
| patient2@fountain.com | Admin@123 | Patient | 4 |

---

## 11. Database Notes for Frontend

> These affect how you interpret session data — you don't need DB access from the frontend.

### Table: `appointment_sessions`
| Column | Meaning |
|--------|---------|
| `id` | Session ID |
| `patient_id` | The patient's users.id |
| `doctor_id` | The doctor's users.id (NOT doctors.id) |
| `scheduled_start` | Planned start (UTC), used to compute scheduled_end |
| `actual_start` | When the first participant joined |
| `actual_end` | When the session was completed/missed |
| `duration_minutes` | How long the session lasts |
| `status` | `scheduled` / `active` / `completed` / `missed` |
| `notified_events` | Internal timer flags (ignore from frontend) |

### Table: `session_messages`
| Column | Meaning |
|--------|---------|
| `id` | Message ID |
| `session_id` | Parent session |
| `sender_id` | users.id of sender |
| `sender_role` | `"patient"` or `"doctor"` |
| `message_text` | The message content |
| `message_type` | `text` / `file` / `system` |
| `sent_at` | Timestamp |
| `is_read` / `read_at` | Read receipt |

### Key relationship: `doctor_id` is `users.id`
- In the `users` table, the doctor is a regular user with `role_id = 3`
- In the `doctors` table, there's a separate record with a different `id` (auto-increment) that has `user_id` pointing back to `users.id`
- **All session fields use `users.id`** for both `patient_id` and `doctor_id`

---

## 12. Frontend Integration Checklist

### React Native (Patient)
- [ ] Login via `/api/auth/login`, store token in secure storage
- [ ] Connect `socket.io-client` to server, emit `addUser(userId)` after login
- [ ] Poll/list `GET /api/patient/sessions` to show session list
- [ ] Show a session card 5 minutes before `scheduled_start`
- [ ] When active, join via `POST /api/sessions/:id/join`
- [ ] Emit `joinSession(sessionId)` on socket to receive real-time messages
- [ ] Listen for `sessionMessage` events and append to message list
- [ ] Send messages via `POST /api/sessions/:id/message`
- [ ] Show `sessionEnding` warning at 1 min remaining
- [ ] Disable chat + show "ended" when `sessionEnded` received
- [ ] Handle `sessionMissed` if applicable

### Next.js (Doctor)
- [ ] Login via `/api/auth/login`
- [ ] Connect socket, emit `addUser(userId)`
- [ ] Poll/list `GET /api/doctor/sessions`
- [ ] When a session starts, navigate to the session detail page
- [ ] Join via `POST /api/sessions/:id/join`
- [ ] Emit `joinSession` on socket for real-time events
- [ ] Chat UI: GET `/messages`, POST `/message`, handle `sessionMessage` live
- [ ] Emit `typing` events — show "Dr. is typing" on patient side
- [ ] Clean up socket listeners on component unmount (`leaveSession`)

### Next.js (Admin)
- [ ] Login via `/api/auth/login`
- [ ] From appointment detail view, call `POST /api/admin/appointments/:id/start-session`
- [ ] Pass `patient_id`, `doctor_id` (both as users.id), `scheduled_start` (UTC ISO), `duration_minutes`
- [ ] On success, the session appears in the patient's and doctor's session lists
- [ ] No socket connection needed (notifications fire server-to-client automatically)

---

## 13. Error Handling Guide

| HTTP Code | Likely cause | What frontend should do |
|-----------|-------------|------------------------|
| 400 | Validation error (missing field, wrong type) | Show inline error on the form field |
| 400 | "Session not yet open for joining" | Show countdown — enable join button at T-5min |
| 400 | "Session has already ended" | Show read-only session ended view |
| 400 | "Session is not active" | Show message input disabled, "Session not started" |
| 400 | "Session time window has passed" | Disable message input |
| 401 | Token expired or invalid | Redirect to login screen |
| 403 | Not a participant / not admin | Show "Access denied" screen |
| 404 | Session/ID not found | Show "Session not found" |
| 500 | Server error | Show generic error, retry once |

---

## 14. Common Integration Pitfalls

1. **Token rotation** — Each login generates a new `session_id` in the DB, invalidating all previous tokens. If you cache tokens aggressively, the user may get 401'd. Re-login or use a fresh token for each test.

2. **`doctor_id` is NOT `doctors.id`** — The doctor's ID in session payloads and the `users` table is `users.id`. Do NOT use the `doctors` table `id` when creating sessions. The seed data has doctor user id=2.

3. **Join window** — A session can only be joined starting 5 minutes before `scheduled_start`. If your UI shows a session 6+ minutes before start, the join button should be disabled.

4. **Message ordering** — Messages come back ordered by `sent_at` ascending. For chat UI, append new messages at the bottom.

5. **Read receipts** — `POST /read` marks messages **from the other participant** as read. It does NOT mark your own outgoing messages as read (that doesn't make sense).

6. **Socket resilience** — If the real-time socket connection drops, HTTP endpoints still work (send/get messages via REST). Messages send via HTTP; real-time push via socket is a bonus.

7. **Session status transitions** — `status` goes `scheduled → active → completed`. If nobody joins, it goes `scheduled → missed` (after 5 min past start). The `notified_events` array tracks which timer events have fired.
