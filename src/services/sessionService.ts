import { api } from '../api/client';
import { Session } from '../types';

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MessageRaw {
  id: string | number;
  session_id: string | number;
  sender_id: string | number;
  sender_role?: 'patient' | 'doctor';
  message_text: string;
  message_type?: string;
  sent_at: string;
  is_read?: boolean;
  read_at?: string | null;
}

/** REST client for the Fountain session feature. */
export const sessionService = {
  /** List sessions for the authenticated patient. */
  async getPatientSessions(page = 1, limit = 50): Promise<{ sessions: Session[]; pagination: Pagination }> {
    const { data } = await api.get('/api/patient/sessions', { params: { page, limit } });
    return data.data as { sessions: Session[]; pagination: Pagination };
  },

  /** List sessions for the authenticated doctor. */
  async getDoctorSessions(page = 1, limit = 50): Promise<{ sessions: Session[]; pagination: Pagination }> {
    const { data } = await api.get('/api/doctor/sessions', { params: { page, limit } });
    return data.data as { sessions: Session[]; pagination: Pagination };
  },

  /** Get a single session (participant only). */
  async getSession(id: number | string): Promise<Session> {
    const { data } = await api.get(`/api/sessions/${id}`);
    return data.data as Session;
  },

  /** Join a session (transition to active). Optional socketId attaches your socket to the room. */
  async joinSession(id: number | string, socketId?: string) {
    const { data } = await api.post(`/api/sessions/${id}/join`, socketId ? { socketId } : {});
    return data.data as { session_id: string; status: string; actual_start?: string; scheduled_end?: string };
  },

  /** Send a message via REST (persisted; socket pushes it to the room). */
  async sendMessage(id: number | string, payload: { message_text: string; message_type?: string }): Promise<MessageRaw> {
    const { data } = await api.post(`/api/sessions/${id}/message`, {
      message_type: 'text',
      ...payload,
    });
    return data.data as MessageRaw;
  },

  /** Get message history (ordered oldest → newest). */
  async getMessages(id: number | string, page = 1, limit = 100): Promise<{ messages: MessageRaw[]; pagination: Pagination }> {
    const { data } = await api.get(`/api/sessions/${id}/messages`, { params: { page, limit } });
    return data.data as { messages: MessageRaw[]; pagination: Pagination };
  },

  /** Mark the other participant's messages as read. */
  async markRead(id: number | string): Promise<void> {
    await api.post(`/api/sessions/${id}/read`);
  },
};
