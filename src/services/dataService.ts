import { authService } from './authService';
import { sessionService, MessageRaw } from './sessionService';
import { AppNotification, CallDirection, CallLog, Chat, Conversation, Message, SessionStatus, User } from '../types';
import { api } from '../api/client';

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
  else if (c.state === 'rejected') lastMessage = 'Request rejected';
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
    // Rejected requests are not real sessions — hide them from the chat list so
    // no chat/session card is created for them (they never appear as an
    // openable chat; they only count as "No Show" records on the backend).
    const visible = conversations.filter((c) => c.state !== 'rejected');
    // Defensive: keep only the most recent conversation per peer so the list
    // shows one row per patient–doctor pair.
    const byPeer = new Map<string, Conversation>();
    for (const c of visible) {
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
  /** Call history for the current user, most recent first (WhatsApp-style). */
  async getCallHistory(limit = 50, offset = 0): Promise<CallLog[]> {
    try {
      const { data } = await api.get('/api/calls/history', {
        params: { limit, offset },
      });
      const records = (data?.data ?? data ?? []) as CallHistoryRaw[];
      return records.map(mapCallHistoryRow);
    } catch (error) {
      console.error('Failed to fetch call history:', error);
      return [];
    }
  },
};

/** Raw call-history row returned by GET /api/calls/history. */
interface CallHistoryRaw {
  consultationId: number;
  callId: string;
  callStatus: string;
  callType: string;
  callerUserId: number;
  receiverUserId: number;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  endReason: string | null;
  doctorUserId: number;
  patientUserId: number;
  patientName?: string;
  doctorName?: string;
  /** Backend emits snake_case — keep both spellings. */
  peer_name?: string;
  peer_user_id?: number;
  duration_seconds?: number | null;
  peerName?: string;
  peerUserId?: number;
  durationSeconds?: number | null;
  direction: string; // 'outgoing' | 'incoming' (server-computed for current user)
}

const formatCallDuration = (secs: number): string => {
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  if (m === 0) return `${s} sec`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} sec`;
};

/** Map a backend call-history row → the WhatsApp-style CallLog model. */
const mapCallHistoryRow = (r: CallHistoryRaw): CallLog => {
  const madeByMe = r.direction === 'outgoing';
  const answered =
    !!r.answeredAt && !['missed', 'rejected', 'failed'].includes(r.callStatus);
  const direction: CallDirection = answered
    ? madeByMe
      ? 'outgoing'
      : 'incoming'
    : 'missed';
  // Backend returns snake_case keys (peer_name / peer_user_id /
  // duration_seconds) — read both spellings defensively.
  const peerName = r.peer_name ?? r.peerName;
  const peerUserId = r.peer_user_id ?? r.peerUserId;
  const durationSeconds = r.duration_seconds ?? r.durationSeconds;
  return {
    id: r.callId || String(r.consultationId),
    participantId: String(peerUserId),
    participantName: peerName || 'Unknown',
    participantAvatar: null,
    type: r.callType === 'video' ? 'video' : 'voice',
    direction,
    madeByMe,
    consultationId: r.consultationId,
    callStatus: r.callStatus,
    duration:
      durationSeconds != null && durationSeconds > 0
        ? formatCallDuration(durationSeconds)
        : undefined,
    startedAt: r.startedAt ?? r.endedAt ?? new Date().toISOString(),
  };
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
