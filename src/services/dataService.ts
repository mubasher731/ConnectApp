import { authService } from './authService';
import { sessionService, MessageRaw } from './sessionService';
import { AppNotification, CallLog, Chat, Conversation, Message, SessionStatus, User } from '../types';

/** Derive the chat status badge from state + schedule so "Active" spans the whole session. */
const mapChatStatus = (c: Conversation): SessionStatus => {
  if (c.state === 'pending') return 'pending';
  if (c.state === 'rejected') return 'rejected';
  if (c.state === 'ended') return 'completed';
  const nowMs = Date.now();
  const startMs = c.scheduled_start ? new Date(c.scheduled_start).getTime() : null;
  const endMs = c.scheduled_end ? new Date(c.scheduled_end).getTime() : null;
  if (startMs !== null && nowMs < startMs) return 'scheduled'; // Upcoming
  if (endMs !== null && nowMs >= endMs) return 'completed'; // Consulted
  return 'active'; // In progress → Active
};

/** Map a backend conversation to the Chat list model ("other" participant = chat). */
const mapConversationToChat = (c: Conversation, meId: number): Chat => {
  const isPatient = c.patient_id === meId;
  const otherId = isPatient ? c.doctor_id : c.patient_id;
  const otherName = isPatient ? c.doctor_name ?? 'Doctor' : c.patient_name ?? 'Patient';
  let lastMessage = 'Session scheduled';
  if (c.state === 'pending') lastMessage = 'Request pending';
  else if (c.state === 'active' || c.state === 'in_progress') lastMessage = 'Session active';
  else if (c.state === 'ended') lastMessage = 'Session ended';

  const durationMinutes =
    c.scheduled_start && c.scheduled_end
      ? Math.max(
          0,
          Math.round(
            (new Date(c.scheduled_end).getTime() - new Date(c.scheduled_start).getTime()) /
              60_000
          )
        )
      : undefined;

  return {
    id: String(c.id),
    participantId: String(c.peer_user_id ?? otherId),
    participantName: otherName,
    participantOnline: c.peer_online ?? false,
    lastMessage,
    lastMessageAt: c.scheduled_start ?? '',
    unreadCount: 0,
    isTyping: false,
    status: mapChatStatus(c),
    durationMinutes,
    startTime: c.actual_start ?? c.scheduled_start,
    endTime: c.actual_end ?? null,
  };
};

/** Map a raw backend message to the UI Message model. */
const mapMessage = (
  raw: MessageRaw,
  meId: number,
  isPatient: boolean,
  conversationId: string | number
): Message => {
  const sentByMe = (raw.role === 'patient') === isPatient;
  return {
    id: raw.id,
    sessionId: raw.consultation_id ?? conversationId,
    senderId: sentByMe ? meId : 0,
    senderRole: raw.role,
    text: raw.content ?? '',
    type: raw.type ?? 'text',
    createdAt: raw.created_at ?? '',
    isRead: raw.status === 'read' || raw.is_read === true,
    sentByMe,
    mediaUrl: raw.media_url ?? null,
  };
};

export const chatService = {
  /** Conversations for the authenticated user → Chat rows (one per peer). */
  async getChats(): Promise<Chat[]> {
    const me = await authService.getMe();
    const conversations = await sessionService.getConversations();
    // Defensive: keep only the most recent conversation per peer so the list
    // shows one row per patient–doctor pair.
    const byPeer = new Map<string, Conversation>();
    for (const c of conversations) {
      const peer = String(
        c.peer_user_id ?? (c.patient_id === me.id ? c.doctor_id : c.patient_id)
      );
      const existing = byPeer.get(peer);
      if (
        !existing ||
        new Date(c.scheduled_start).getTime() > new Date(existing.scheduled_start).getTime()
      ) {
        byPeer.set(peer, c);
      }
    }
    // Active conversations always appear at the top of the list.
    return [...byPeer.values()]
      .map((c) => mapConversationToChat(c, me.id))
      .sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        return 0;
      });
  },

  /** Messages for a conversation (oldest → newest). No options = all messages. */
  async getMessages(conversationId: string | number, options: { limit?: number; skip?: number } = {}): Promise<Message[]> {
    const me = await authService.getMe();
    const isPatient = me.role_id === 4;
    const raws = await sessionService.getMessages(conversationId, options);
    return raws.map((m) => mapMessage(m, me.id, isPatient, conversationId));
  },

  /** Send a message (REST; socket broadcasts it to the room). */
  async sendMessage({
    sessionId,
    content,
    type,
    files,
  }: {
    sessionId: string | number;
    content?: string;
    type?: string;
    files?: any[];
  }): Promise<Message> {
    const me = await authService.getMe();
    const isPatient = me.role_id === 4;
    const saved = await sessionService.sendMessage(sessionId, {
      content,
      type,
      files,
    });
    return mapMessage(saved, me.id, isPatient, sessionId);
  },

  /** Find an existing conversation with a user (used by the directory). */
  async getOrCreateSessionWith(other: User): Promise<Chat> {
    const me = await authService.getMe();
    const conversations = await sessionService.getConversations();
    const found = conversations.find(
      (c) => c.patient_id === other.id || c.doctor_id === other.id
    );
    if (!found) {
      throw new Error('No conversation with this user yet — it appears once scheduled.');
    }
    return mapConversationToChat(found, me.id);
  },
};

export const callService = {
  // No call-history endpoint in the current API contract — returns empty.
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
