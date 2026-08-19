/**
 * Mock session + chat engine backed by AsyncStorage.
 *
 * Simulates the Fountain backend until the real endpoints are ready:
 *  - Sessions are persisted per patient-doctor pair.
 *  - Message history survives across ALL sessions between the same pair
 *    (WhatsApp-style persistent chat), so a new booking reopens the full
 *    conversation history.
 *
 * Storage keys:
 *  @connectapp/mock_sessions       -> MockSession[]
 *  @connectapp/mock_messages       -> MockMessage[]
 *  @connectapp/mock_seeded_v1      -> boolean (demo history seeded once)
 *  @connectapp/mock_fired_reminders -> string[] (dedup keys)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type MockSessionStatus = 'scheduled' | 'active' | 'completed';

export interface MockSession {
  id: string;
  patientId: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  scheduledStart: string; // ISO
  durationMinutes: number;
  status: MockSessionStatus;
  /** Total minutes added via the "Extend +5 min" action. */
  extendedBy: number;
  createdAt: string;
}

export type MockMessageType = 'text' | 'system';

export interface MockMessage {
  id: string;
  sessionId: string;
  patientId: number;
  doctorId: number;
  senderId: number;
  senderRole: 'patient' | 'doctor';
  text: string;
  type: MockMessageType;
  createdAt: string; // ISO
}

const SESSIONS_KEY = '@connectapp/mock_sessions';
const MESSAGES_KEY = '@connectapp/mock_messages';
const SEED_KEY = '@connectapp/mock_seeded_v1';
const REMINDERS_KEY = '@connectapp/mock_fired_reminders';

const read = async <T>(key: string, fallback: T): Promise<T> => {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const write = async (key: string, value: unknown): Promise<void> => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

interface StoreCache {
  sessions: MockSession[];
  messages: MockMessage[];
}

let cache: StoreCache | null = null;

const loadAll = async (): Promise<StoreCache> => {
  if (cache) return cache;
  const [sessions, messages] = await Promise.all([
    read<MockSession[]>(SESSIONS_KEY, []),
    read<MockMessage[]>(MESSAGES_KEY, []),
  ]);
  cache = { sessions, messages };
  return cache;
};

const persist = async (): Promise<void> => {
  if (!cache) return;
  await Promise.all([
    write(SESSIONS_KEY, cache.sessions),
    write(MESSAGES_KEY, cache.messages),
  ]);
};

export const mockSessionStore = {
  async createSession(input: {
    patientId: number;
    patientName: string;
    doctorId: number;
    doctorName: string;
    scheduledStart: string;
    durationMinutes: number;
  }): Promise<MockSession> {
    const all = await loadAll();
    const session: MockSession = {
      id: `MS-${Date.now()}-${all.sessions.length + 1}`,
      ...input,
      status: 'scheduled',
      extendedBy: 0,
      createdAt: new Date().toISOString(),
    };
    all.sessions.push(session);
    await persist();
    return session;
  },

  async getSession(id: string): Promise<MockSession | null> {
    const all = await loadAll();
    return all.sessions.find((s) => s.id === id) ?? null;
  },

  async listSessions(): Promise<MockSession[]> {
    const all = await loadAll();
    return [...all.sessions].sort((a, b) =>
      a.scheduledStart.localeCompare(b.scheduledStart)
    );
  },

  async listSessionsForUser(userId: number): Promise<MockSession[]> {
    const all = await loadAll();
    return all.sessions.filter((s) => s.patientId === userId || s.doctorId === userId);
  },

  async listSessionsForPair(patientId: number, doctorId: number): Promise<MockSession[]> {
    const all = await loadAll();
    return all.sessions.filter(
      (s) => s.patientId === patientId && s.doctorId === doctorId
    );
  },

  async updateSession(
    id: string,
    patch: Partial<Pick<MockSession, 'status' | 'extendedBy'>>
  ): Promise<void> {
    const all = await loadAll();
    all.sessions = all.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s));
    await persist();
  },

  async addMessage(
    session: MockSession,
    input: {
      senderId: number;
      senderRole: 'patient' | 'doctor';
      text: string;
      type?: MockMessageType;
    }
  ): Promise<MockMessage> {
    const all = await loadAll();
    const msg: MockMessage = {
      id: `M-${Date.now()}-${all.messages.length + 1}`,
      sessionId: session.id,
      patientId: session.patientId,
      doctorId: session.doctorId,
      senderId: input.senderId,
      senderRole: input.senderRole,
      text: input.text,
      type: input.type ?? 'text',
      createdAt: new Date().toISOString(),
    };
    all.messages.push(msg);
    await persist();
    return msg;
  },

  async addSystemMessage(session: MockSession, text: string): Promise<MockMessage> {
    return mockSessionStore.addMessage(session, {
      senderId: 0,
      senderRole: 'doctor',
      text,
      type: 'system',
    });
  },

  /** Messages for a single session, oldest → newest. */
  async getMessages(sessionId: string): Promise<MockMessage[]> {
    const all = await loadAll();
    return all.messages
      .filter((m) => m.sessionId === sessionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  /**
   * Messages from ALL prior sessions between a patient-doctor pair
   * (excludes the current session) — powers the persistent chat history.
   */
  async getHistoryForPair(
    patientId: number,
    doctorId: number,
    excludeSessionId: string
  ): Promise<MockMessage[]> {
    const all = await loadAll();
    return all.messages
      .filter(
        (m) =>
          m.patientId === patientId &&
          m.doctorId === doctorId &&
          m.sessionId !== excludeSessionId
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  /* ------------------------- reminder dedup helpers ------------------------ */

  async hasFiredReminder(id: string): Promise<boolean> {
    const fired = await read<string[]>(REMINDERS_KEY, []);
    return fired.includes(id);
  },

  async markReminderFired(id: string): Promise<void> {
    const fired = await read<string[]>(REMINDERS_KEY, []);
    if (!fired.includes(id)) {
      fired.push(id);
      await write(REMINDERS_KEY, fired);
    }
  },

  /* ------------------------------ demo seeding ------------------------------ */

  /**
   * Seeds one completed past session (with a short conversation) between the
   * patient and Dr. Ahmad Khan so the "Previous Sessions" history separator is
   * immediately demonstrable when booking that doctor. Runs once per install.
   */
  async ensureSeed(user: { id: number; name: string }): Promise<void> {
    if (!user.id || user.id === 2) return; // skip for the doctor demo account
    const seeded = await read<boolean>(SEED_KEY, false);
    if (seeded) return;

    const all = await loadAll();
    const base = Date.now() - 2 * 86_400_000; // 2 days ago
    const past: MockSession = {
      id: `MS-SEED-${user.id}`,
      patientId: user.id,
      patientName: user.name,
      doctorId: 2,
      doctorName: 'Dr. Ahmad Khan',
      scheduledStart: new Date(base).toISOString(),
      durationMinutes: 10,
      status: 'completed',
      extendedBy: 0,
      createdAt: new Date(base).toISOString(),
    };
    all.sessions.push(past);

    const seedRows: [number, 'patient' | 'doctor', string, number][] = [
      [user.id, 'patient', 'Hello doctor, I have had a mild fever since yesterday.', 5 * 60_000],
      [2, 'doctor', 'Hello! Sorry to hear that. How high is the temperature?', 6 * 60_000],
      [user.id, 'patient', 'It was 100.4°F this morning, and I have a slight headache too.', 7 * 60_000],
      [2, 'doctor', 'Okay. Please rest and stay hydrated. Take paracetamol and I will check on you tomorrow.', 8 * 60_000],
      [user.id, 'patient', 'Thank you doctor, I will. Goodnight.', 9 * 60_000],
    ];
    seedRows.forEach(([senderId, role, text, offset], i) => {
      all.messages.push({
        id: `MS-SEED-M-${user.id}-${i}`,
        sessionId: past.id,
        patientId: user.id,
        doctorId: 2,
        senderId,
        senderRole: role,
        text,
        type: 'text',
        createdAt: new Date(base + offset).toISOString(),
      });
    });

    await persist();
    await write(SEED_KEY, true);
  },
};
