/** Core domain types for ConnectApp — mirror the Fountain Backend API. */

export interface User {
  id: number;
  name: string;
  email: string;
  role_id: number; // 2 = admin, 3 = doctor, 4 = patient
  avatar?: string | null;
  status?: string;
  email_verified?: boolean;
  session_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type SessionStatus = 'scheduled' | 'active' | 'completed' | 'missed';

export interface Session {
  id: number;
  appointment_id?: number;
  patient_id: number;
  doctor_id: number;
  scheduled_start: string;
  actual_start?: string | null;
  actual_end?: string | null;
  duration_minutes: number;
  status: SessionStatus;
  doctor_name?: string;
  patient_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Chat {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string | null;
  participantOnline: boolean;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isTyping: boolean;
}

export interface Message {
  id: string | number;
  sessionId: string | number;
  senderId: string | number;
  senderRole?: 'patient' | 'doctor';
  /** Alias of the API `message_text` field for UI rendering. */
  text: string;
  /** Alias of the API `message_type` field. */
  type: string;
  /** Alias of the API `sent_at` field. */
  createdAt: string;
  isRead?: boolean;
  sentByMe: boolean;
}

export type CallDirection = 'incoming' | 'outgoing' | 'missed';
export type CallType = 'voice' | 'video';

export interface CallLog {
  id: string;
  participantId?: string;
  participantName: string;
  participantAvatar?: string | null;
  type: CallType;
  direction: CallDirection;
  duration?: string;
  startedAt: string;
}

export type NotificationKind =
  | 'message'
  | 'appointment'
  | 'prescription'
  | 'reminder'
  | 'system';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

