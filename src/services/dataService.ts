import { authService } from './authService';
import { sessionService, MessageRaw } from './sessionService';
import { AppNotification, CallLog, Chat, Message, Session, User } from '../types';

/** Map a backend session to the Chat list model ("other" participant = chat). */
const mapSessionToChat = (session: Session, meId: number): Chat => {
  const isPatient = session.patient_id === meId;
  const otherId = isPatient ? session.doctor_id : session.patient_id;
  const otherName = isPatient ? session.doctor_name : session.patient_name;
  return {
    id: String(session.id),
    participantId: String(otherId),
    participantName: otherName ?? 'Participant',
    participantOnline: false,
    lastMessage: '',
    lastMessageAt: session.scheduled_start ?? '',
    unreadCount: 0,
    isTyping: false,
    status: session.status,
  };
};

/** Map a raw API message to the UI Message model. */
const mapMessage = (raw: MessageRaw, meId: number, sessionId: string | number): Message => ({
  id: raw.id,
  sessionId: raw.session_id ?? sessionId,
  senderId: raw.sender_id,
  senderRole: raw.sender_role,
  text: raw.message_text ?? '',
  type: raw.message_type ?? 'text',
  createdAt: raw.sent_at ?? '',
  isRead: raw.is_read,
  sentByMe: raw.sender_id === meId,
});

export const chatService = {
  async getChats(): Promise<Chat[]> {
    const me = await authService.getMe();
    const isDoctor = me.role_id === 3;
    const { sessions } = isDoctor
      ? await sessionService.getDoctorSessions(1, 100)
      : await sessionService.getPatientSessions(1, 100);
    // One row per session — a participant can have multiple sessions
    // scheduled, so each session becomes its own conversation entry.
    return (sessions ?? []).map((session) => mapSessionToChat(session, me.id));
  },

  async getMessages(sessionId: string | number): Promise<Message[]> {
    const me = await authService.getMe();
    const { messages } = await sessionService.getMessages(sessionId, 1, 100);
    // Backend returns oldest → newest already; render as-is.
    return (messages ?? []).map((m) => mapMessage(m, me.id, sessionId));
  },

  /** Send a message via REST (session must be active; socket pushes it to the room). */
  async sendMessage({ sessionId, content }: { sessionId: string | number; content: string }): Promise<Message> {
    const me = await authService.getMe();
    const saved = await sessionService.sendMessage(sessionId, { message_text: content });
    return mapMessage(saved, me.id, sessionId);
  },

  /**
   * Open a session with a user. Sessions are scheduled by the care team
   * (admin) — this only finds an existing one; it does not create sessions.
   */
  async getOrCreateSessionWith(other: User): Promise<Chat> {
    const me = await authService.getMe();
    const isDoctor = me.role_id === 3;
    const { sessions } = isDoctor
      ? await sessionService.getDoctorSessions(1, 100)
      : await sessionService.getPatientSessions(1, 100);
    const found = (sessions ?? []).find(
      (s) => s.patient_id === other.id || s.doctor_id === other.id
    );
    if (!found) {
      throw new Error('No session with this user yet — it will appear once scheduled.');
    }
    return mapSessionToChat(found, me.id);
  },
};

export const callService = {
  // No call-history endpoint in the current session spec — returns empty.
  async getCallHistory(): Promise<CallLog[]> {
    return [];
  },
};

export const notificationService = {
  // No notifications endpoint in the current API contract — returns empty.
  async getNotifications(): Promise<AppNotification[]> {
    return [];
  },
  async markAllRead(): Promise<void> {
    // No-op until the backend exposes a notifications endpoint.
  },
};
