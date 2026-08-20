import { authService } from './authService';
import { sessionService, MessageRaw } from './sessionService';
import { AppNotification, CallLog, Chat, Conversation, Message, User } from '../types';

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
    participantId: String(otherId),
    participantName: otherName,
    participantOnline: c.peer_online ?? false,
    lastMessage,
    lastMessageAt: c.scheduled_start ?? '',
    unreadCount: 0,
    isTyping: false,
    status: c.state === 'ended' ? 'completed' : c.state === 'pending' ? 'scheduled' : 'active',
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
    sessionId: raw.conversation_id ?? conversationId,
    senderId: sentByMe ? meId : 0,
    senderRole: raw.role,
    text: raw.content ?? '',
    type: raw.type ?? 'text',
    createdAt: raw.created_at ?? '',
    isRead: raw.status === 'read',
    sentByMe,
  };
};

export const chatService = {
  /** Conversations for the authenticated user → Chat rows. */
  async getChats(): Promise<Chat[]> {
    const me = await authService.getMe();
    const conversations = await sessionService.getConversations();
    return conversations.map((c) => mapConversationToChat(c, me.id));
  },

  /** Messages for a conversation (oldest → newest). */
  async getMessages(conversationId: string | number): Promise<Message[]> {
    const me = await authService.getMe();
    const isPatient = me.role_id === 4;
    const raws = await sessionService.getMessages(conversationId);
    return raws.map((m) => mapMessage(m, me.id, isPatient, conversationId));
  },

  /** Send a message (REST; socket broadcasts it to the room). */
  async sendMessage({
    sessionId,
    content,
  }: {
    sessionId: string | number;
    content: string;
  }): Promise<Message> {
    const me = await authService.getMe();
    const isPatient = me.role_id === 4;
    const saved = await sessionService.sendMessage(sessionId, { content });
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
