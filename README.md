# ConnectApp — Healthcare Communication Platform

**ConnectApp** is a modern, role-based healthcare communication app built with **React Native** (TypeScript). It connects **patients** and **doctors** through secure chat, appointment booking, session management, and real-time notifications — backed by the **Fountain Backend** over REST + Socket.IO, with a fully mocked offline layer so every feature works end-to-end today.

---

## ✨ Features

### Patients
- **Home** — personalized greeting, quick actions (Messages / Calls / Doctors), recent conversations.
- **Chats** — session list with status filters (All / Upcoming / Consulted / No Show).
- **Persistent chat history (WhatsApp style)** — conversation history is kept forever between the same patient & doctor; reopening a chat shows the **entire history from all previous sessions** with a *"Previous Sessions — read only"* separator (original timestamps preserved).
- **Calls** — voice/video call history.
- **Doctors & Book Appointment** — doctor directory with profile cards, and a booking modal with **15-minute interval time slots**.
- **Profile** — edit name/email, sign out.

### Doctors
- **Dashboard** — live stats (Total Assigned, Awaiting Action, Active Sessions, Completed), patient search, **Appointment Requests** (Accept/Reject), Recent Appointments with urgency filter.
- **Consultations** — full request list with severity & status filters and search.

### Shared / Real-time
- **Real-time chat** — send = REST, receive = Socket.IO (typing indicators, presence, session lifecycle banners).
- **Session countdown** — live "Starts in mm:ss" / "mm:ss remaining" banner with input auto-lock.
- **Pre-session notifications (5 min before)** — role-specific alerts with action buttons.
- **Session extension alert (1 min before end)** — full-screen "Extend +5 min" prompt for the doctor.
- **Personalized notifications** — each user (by `user_id` + role) sees only their own notifications in the Notifications tab.

---

## 🏗 Architecture & Data Flow

```
┌─────────────────────────┐        REST (axios)          ┌──────────────────────┐
│   React Native (client) │ ───────────────────────────▶ │  Fountain Backend    │
│                         │ ◀─────────────────────────── │  (sessions, auth,    │
│   screens / components  │                              │   config, ...)       │
│   services / context    │        Socket.IO (real-time) │                      │
│   mock layer (local)    │ ◀──────────────────────────▶ │                      │
└─────────────────────────┘                              └──────────────────────┘
```

- **Frontend** is a React Native app that talks to the backend over **HTTP (REST)** and **Socket.IO (real-time)**.
- **Backend URL discovery** — the app calls `GET /api/config`, and the backend replies with its public URL (e.g., an ngrok tunnel). The app then points both its REST client and Socket.IO connection at that URL. A fallback URL is configured in `src/api/config.ts`.
- **Mock/offline layer** — booking requests, slot availability, persistent chat history, session timers and notifications are implemented in-app (in-memory + AsyncStorage) so every feature is demoable **without waiting for backend endpoints**. The architecture is designed so these swap to API calls when the endpoints are ready.

### Where data lives today
| Data | Storage | Notes |
|---|---|---|
| Sessions (real) | Backend (REST) | Fetched per role; messages via REST + socket |
| Booking requests | In-memory mock store (`bookingStore`) | Patient creates, doctor accepts/rejects |
| Slot locks / availability | In-memory mock store | 60-second reservations + permanent bookings |
| Chat history & mock sessions | **AsyncStorage** | WhatsApp-style persistence per patient–doctor pair |
| Notifications | **AsyncStorage** | Scoped by `user_id` + role |

---

## 🔌 Backend — API Endpoints

> The **Fountain Backend** owns authentication, sessions, and real-time events. The app consumes the endpoints below. (Backend code is out of scope for this document — only the contract is described.)

### Configuration
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/config` | Returns the backend's public URL (ngrok/dynamic host). The client uses this to configure REST + Socket.IO at runtime. |

### Session Management
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/patient/sessions?page=&limit=` | List sessions for the authenticated **patient** |
| GET | `/api/doctor/sessions?page=&limit=` | List sessions for the authenticated **doctor** |
| GET | `/api/sessions/:id` | Fetch a single session's details (status, timings, duration) |
| POST | `/api/sessions/:id/join` | Join / start a session (optionally attach a `socketId` to the room) |
| POST | `/api/sessions/:id/message` | Send a message to a session (`{ message_text }`) |
| GET | `/api/sessions/:id/messages?page=&limit=` | Message history for a session (oldest → newest) |
| POST | `/api/sessions/:id/read` | Mark the other participant's messages as read |

### Real-Time (Socket.IO)
The socket is used for live chat + session events. **Rule: send via REST, receive via Socket.IO.**

- **Client → Server:** `addUser`, `joinSession`, `leaveSession`, `typing`, `typingStopped`
- **Server → Client:** `sessionMessage`, `typing`, `typingStopped`, `userPresence`, `sessionStarted`, `sessionEnding`, `sessionEnded`, `sessionMissed`, `userJoined`

### Book an Appointment & Slot Management
> Currently implemented as an **in-app mock layer** (no backend endpoints yet). When the backend exposes them, the mock layer will be replaced by calls like `POST /api/appointments` and `GET /api/doctors/:id/slots`. Until then, this is how it behaves:

- **Slot generation** — slots are generated in **15-minute intervals** from `09:00am` to `05:00pm` (e.g., `10:00am - 10:15am`).
- **Availability check** — when a patient selects a slot, the app runs a **simulated 10-second check**: a spinner shows *"Checking availability…"*, then either ✅ **Available** (Send enabled) or ❌ **Already Booked** (Send disabled).
- **Slot locking** — selecting an available slot **reserves it for 60 seconds** to simulate real-time booking; if another patient tries to book the same slot during that window, they get an *"already booked"* alert. Slots that already have a confirmed request are shown greyed out with a **"Booked"** tag.
- **Booking request** — on send, a request is created (pending) for the doctor, and a **mock session** is scheduled at the **selected slot time** (its next occurrence).

### Notifications (mock)
- Notifications are stored locally with a **target `user_id` + role**, so after login each user only sees their own.
- **On booking:** patient sees *"You booked appointment with Dr. [Name] at [Time]"*; doctor sees *"📋 New booking from [Patient] at [Time]"*.
- **On doctor accept:** patient sees *"✅ Appointment confirmed with Dr. [Name] at [Time]"*; doctor sees *"Appointment with [Patient] at [Time]"*.

---

## 🎯 Slot Availability — How It Works

1. Patient opens **Book Appointment** for a doctor.
2. Picks a slot from the 15-minute dropdown.
3. App runs the **10-second simulated check** against the local availability model.
4. **Available** → slot is reserved for 60s → ✅ shown → **Send** enabled.
5. **Already booked** (permanent request or held by another patient) → ❌ shown → **Send** disabled.
6. On **Send**, the booking request is created, the reservation is released, and the mock session is scheduled.

---

## 🔄 Session Lifecycle (Mock Demo Layer)

Once a session is scheduled, the in-app engine (a global 1-second ticker) manages it automatically:

- **T-minus 5 min** → both patient & doctor get a **pre-session notification** (role-specific, with **Join Session** / **View Details** actions).
- **Start time** → session becomes active; the chat countdown flips from *"Starts in …"* to *"… remaining"* and the input unlocks.
- **1 minute before end** → the doctor gets a **full-screen extension alert** (*"Session ending in 60 seconds"*):
  - **Cancel** → session ends on time
  - **Extend +5 min** → timer resets and both sides see a *"Session extended by 5 minutes"* system message
  - **Ignore** → session ends automatically

---

## 🚀 Running the Frontend

### Prerequisites
- Node.js 18+ and a package manager (npm/yarn)
- **Android:** Android Studio + emulator/device (JDK 17)
- **iOS:** macOS + Xcode + CocoaPods
- Optional: the **Fountain Backend** running and reachable (same Wi-Fi or an ngrok tunnel)

### 1. Install dependencies
```sh
npm install
```

### 2. (iOS only) Install CocoaPods
```sh
cd ios && pod install && cd ..
```

### 3. Start Metro
```sh
npm start
```
> Keep Metro running in its own terminal.

### 4. Run the app
```sh
# Android
npm run android

# iOS
npm run ios
```

### 5. Connect the backend (optional)
The backend URL is discovered automatically via `GET /api/config`. If it isn't reachable, edit the fallback in `src/api/config.ts`:

```ts
export const FALLBACK_BASE_URL = 'http://<your-backend-host>:5002';
```

### 6. Tests & validation
```sh
npx tsc --noEmit      # type check
npx eslint src        # lint
npm test              # jest tests
```

---

## 🧪 Demo Accounts
- **Patient:** any registered account (sign up in the app)
- **Doctor:** `doctor@fountain.com` / `12345678` (mock doctor login)

> All features (booking, slots, chat history, notifications, session timers) run on local/mock data, so the app is fully demoable even with no backend.
