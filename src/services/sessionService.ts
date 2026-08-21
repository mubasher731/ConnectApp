import { api } from '../api/client';
import { authService } from './authService';
import { AppointmentRequest, BackendNotification, Conversation, DoctorAvailability } from '../types';

/**
 * The `/api/conversations` list omits participant names, which made the UI
 * fall back to generic "Doctor"/"Patient" labels. We resolve the real names
 * from the endpoints that DO expose them and cache the result briefly:
 *  - patients → GET /api/doctor/availability (`id` = doctor users.id, `full_name`)
 *  - doctors  → GET /api/doctor/requests (`patient_id` + `patient_name`, when present)
 */
let peerNameCache: { at: number; roleId: number; map: Map<string, string> } | null = null;

async function getPeerNameData(): Promise<{ roleId: number; map: Map<string, string> }> {
  const now = Date.now();
  if (peerNameCache && now - peerNameCache.at < 60_000) {
    return peerNameCache;
  }
  const map = new Map<string, string>();
  let roleId = 4;
  try {
    const me = await authService.getMe();
    roleId = me.role_id;
    if (roleId === 4) {
      const docs = await sessionService.getAvailableDoctors();
      docs.forEach((d) => {
        const id = String(d.id);
        const name = d.full_name?.trim();
        if (id && name) map.set(id, name);
      });
    } else if (roleId === 3) {
      const reqs = await sessionService.getDoctorRequests();
      reqs.forEach((r) => {
        const id = String(r.patient_id);
        const name = (r as AppointmentRequest & { patient_name?: string }).patient_name?.trim();
        if (id && name) map.set(id, name);
      });
    }
  } catch {
    // Best effort — names stay generic if a source is unavailable.
  }
  peerNameCache = { at: now, roleId, map };
  return peerNameCache;
}

/** Fill in the real peer name (doctor_name / patient_name) on each conversation. */
async function enrichConversationNames(list: Conversation[]): Promise<Conversation[]> {
  if (!Array.isArray(list) || list.length === 0) return list;
  try {
    const { roleId, map } = await getPeerNameData();
    return list.map((c) => {
      const id = String(roleId === 4 ? c.doctor_id : c.patient_id);
      const name = map.get(id);
      if (!name) return c;
      return roleId === 4 ? { ...c, doctor_name: name } : { ...c, patient_name: name };
    });
  } catch {
    return list;
  }
}

export interface MessageRaw {
  id: string | number;
  conversation_id: string | number;
  role: 'patient' | 'doctor';
  content: string;
  type?: string;
  media_url?: string | null;
  status?: string;
  is_read?: boolean;
  created_at: string;
}

/** REST client for the Fountain Doctor–Patient Chat feature. */
export const sessionService = {
  /** List conversations for the authenticated user (patient or doctor). */
  async getConversations(): Promise<Conversation[]> {
    const { data } = await api.get('/api/conversations');
    const list = (data?.data ?? []) as Conversation[];
    // The list omits names — resolve the real peer name for display.
    return enrichConversationNames(list);
  },

  /** Find a single conversation by id (backend has no single-get endpoint). */
  async getConversation(id: string | number): Promise<Conversation | null> {
    const all = await sessionService.getConversations();
    return all.find((c) => String(c.id) === String(id)) ?? null;
  },

  /** Patient books a slot → creates a chat request. */
  async createConversation(input: {
    doctor_id: number;
    date: string;
    time_slot: string;
    reason?: string;
  }): Promise<Conversation> {
    const { data } = await api.post('/api/conversations', input);
    return (data?.data ?? data) as Conversation;
  },

  /** Doctor's pending appointment requests. */
  async getDoctorRequests(): Promise<AppointmentRequest[]> {
    const { data } = await api.get('/api/doctor/requests');
    return (data?.data ?? []) as AppointmentRequest[];
  },

  /** Doctor decision on a request: approved | rescheduled | rejected. */
  async updateConversationStatus(
    id: string,
    body: {
      status: 'approved' | 'rescheduled' | 'rejected';
      date?: string;
      time_slot?: string;
    }
  ): Promise<unknown> {
    const { data } = await api.put(`/api/conversations/${id}/status`, body);
    return data;
  },

  /** Doctor extends an active session by 5 minutes. */
  async extendSession(id: string): Promise<unknown> {
    const { data } = await api.put(`/api/conversations/${id}/extend`);
    return data;
  },

  /** Doctor ends the active session. */
  async endSession(id: string): Promise<unknown> {
    const { data } = await api.put(`/api/conversations/${id}/end`);
    return data;
  },

  /** Read-only conversation history (shared with participants). */
  async getSharedConversation(
    id: string
  ): Promise<{ conversation: Conversation; messages: MessageRaw[] }> {
    const { data } = await api.get(`/api/shared-conversation/${id}`);
    return data?.data ?? { conversation: null as never, messages: [] };
  },

  /** Available doctors with weekly availability slots. */
  async getAvailableDoctors(): Promise<DoctorAvailability[]> {
    const { data } = await api.get('/api/doctor/availability');
    return (data?.data ?? []) as DoctorAvailability[];
  },

  /** Messages for a conversation (oldest → newest). */
  async getMessages(id: string | number): Promise<MessageRaw[]> {
    const { data } = await api.get(`/api/conversations/${id}/messages`);
    return (data?.data ?? []) as MessageRaw[];
  },

  /** Send a message (text/photo/file/voice) in an active conversation. */
  async sendMessage(
    id: string | number,
    payload: { content?: string; type?: string; files?: any[] }
  ): Promise<MessageRaw> {
    // Media messages go as multipart/form-data.
    if (payload.files && payload.files.length > 0) {
      const form = new FormData();
      if (payload.content) form.append('content', payload.content);
      form.append('type', payload.type ?? 'photo');
      payload.files.forEach((f) => form.append('files', f));
      const { data } = await api.post(`/api/conversations/${id}/messages`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return (data?.data ?? data) as MessageRaw;
    }
    const { data } = await api.post(`/api/conversations/${id}/messages`, {
      type: 'text',
      ...payload,
    });
    return (data?.data ?? data) as MessageRaw;
  },

  /* ------------------------------ notifications ----------------------------- */

  /** In-app notifications for the authenticated user. */
  async getNotifications(
    page = 1,
    limit = 20
  ): Promise<{ notifications: BackendNotification[]; pagination: unknown }> {
    const { data } = await api.get('/api/notification/all', {
      params: { page, limit },
    });
    const d = data?.data ?? data ?? {};
    return {
      notifications: d.notifications ?? [],
      pagination: d.pagination,
    };
  },

  /** Mark a notification as read. */
  async markNotificationRead(id: number | string): Promise<void> {
    await api.put(`/api/notification/read/${id}`);
  },

  /** Soft-delete a notification. */
  async deleteNotification(id: number | string): Promise<void> {
    await api.delete(`/api/notification/delete/${id}`);
  },

  /** Register this device for push (backend saves the token). */
  async registerFcmToken(fcmToken: string): Promise<void> {
    await api.post('/api/notification/fcm-token', { fcmToken });
  },
};
