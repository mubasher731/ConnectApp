import { api } from '../api/client';
import { AppointmentRequest, BackendNotification, Conversation, DoctorAvailability } from '../types';

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
    return (data?.data ?? []) as Conversation[];
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
