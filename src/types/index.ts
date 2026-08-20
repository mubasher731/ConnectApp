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
  status?: SessionStatus;
  /** Session duration in minutes (drives the "00 Hrs 04 Mins" row). */
  durationMinutes?: number;
  /** Effective session start time (actual_start ?? scheduled_start). */
  startTime?: string | null;
  /** Session end time when known (actual_end). */
  endTime?: string | null;
  /** True for AsyncStorage-backed mock sessions. */
  isMock?: boolean;
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
  /** Targeted user — personalized notifications are shown only to them. */
  userId?: number;
  userRole?: 'patient' | 'doctor';
}

/* ------------------------------ backend models ------------------------------ */

/** Conversation state values from the Fountain backend SessionTimer. */
export type ConversationState = 'pending' | 'in_progress' | 'active' | 'ended';

export interface ConversationAppointment {
  id: number;
  doctor_id: number;
  patient_id: number;
  status: string;
  date: string;
  time_slot: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

/** A chat conversation (session) between a patient and a doctor. */
export interface Conversation {
  id: string;
  appointment_id?: number;
  doctor_id: number;
  patient_id: number;
  state: ConversationState;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string | null;
  actual_end?: string | null;
  doctor_name?: string;
  patient_name?: string;
  appointment?: ConversationAppointment | null;
  /** The other participant's user id (for socket presence). */
  peer_user_id?: number;
  /** Whether the peer currently has a connected socket. */
  peer_online?: boolean;
}

/** Doctor directory entry from GET /api/doctor/availability. */
export interface DoctorAvailability {
  id: number;
  full_name: string;
  email?: string;
  specialization?: string;
  availability: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    day_name?: string;
    display?: string;
  }[];
}

/** Pending appointment request from GET /api/doctor/requests. */
export interface AppointmentRequest {
  id: string;
  patient_id: number;
  doctor_id: number;
  date: string;
  time_slot: string;
  reason?: string;
  status: string;
  created_at: string;
}

/** Normalized doctor model used by the Doctors screen + booking modal. */
export interface BookingDoctor {
  id: number;
  name: string;
  specialty?: string;
  /** Available slots for the selected day as "HH:MM" (24h). */
  timeSlots: string[];
}

/** Backend in-app notification (GET /api/notification/all). */
export interface BackendNotification {
  id: number;
  sender_id?: number;
  receiver_id: number;
  email?: string;
  title: string;
  body: string;
  type: string;
  data?: {
    conversation_id?: number;
    appointment_id?: number;
    doctor_id?: number;
    patient_id?: number;
    state?: string;
  } | null;
  isRead: boolean;
  created_at: string;
  read_at?: string | null;
  deleted_at?: string | null;
}

