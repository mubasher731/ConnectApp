/**
 * Static / config data shared across screens.
 * Keeping constants out of screen files keeps them slim and easy to update.
 */

import { Colors } from '../theme';
import { CallDirection, ConversationState, NotificationKind } from '../types';

/* ------------------------------ patient home ------------------------------ */

export type QuickActionTarget = 'Chats' | 'Calls' | 'Doctors';

export interface QuickAction {
  key: string;
  icon: string;
  label: string;
  tint: string;
  color: string;
  target?: QuickActionTarget;
}

/** Quick actions shown on the patient Home screen. */
export const QUICK_ACTIONS: QuickAction[] = [
  {
    key: 'chats',
    icon: 'chatbubble-ellipses',
    label: 'Messages',
    tint: Colors.primarySoft,
    color: Colors.primary,
    target: 'Chats',
  },
  {
    key: 'calls',
    icon: 'call',
    label: 'Calls',
    tint: Colors.successSoft,
    color: Colors.success,
    target: 'Calls',
  },
  {
    key: 'directory',
    icon: 'people',
    label: 'Doctors',
    tint: '#E8F0FE',
    color: Colors.info,
    target: 'Doctors',
  },
];

/* ------------------------------ patient chats ------------------------------ */

export type ChatFilterKey = 'all' | 'upcoming' | 'consulted' | 'no_show';

/** Chats tab — status filter chips. */
export const CHAT_FILTERS: { key: ChatFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'consulted', label: 'Consulted' },
  { key: 'no_show', label: 'No Show' },
];

/* ------------------------------- calls screen ------------------------------ */

/** Call log row metadata (icon + label + color) by direction. */
export const CALL_DIRECTION_META: Record<
  CallDirection,
  { icon: string; label: string; color: string }
> = {
  incoming: { icon: 'arrow-down', label: 'Incoming', color: Colors.success },
  outgoing: { icon: 'arrow-up', label: 'Outgoing', color: Colors.primary },
  missed: { icon: 'close', label: 'Missed', color: Colors.error },
};

/* ---------------------------- notifications screen -------------------------- */

/** Notification row metadata by kind. */
export const NOTIFICATION_KIND_META: Record<
  NotificationKind,
  { icon: string; color: string; tint: string }
> = {
  message: {
    icon: 'chatbubble-ellipses',
    color: Colors.primary,
    tint: Colors.primarySoft,
  },
  appointment: {
    icon: 'calendar',
    color: Colors.warning,
    tint: Colors.warningSoft,
  },
  prescription: {
    icon: 'medkit',
    color: Colors.success,
    tint: Colors.successSoft,
  },
  reminder: {
    icon: 'notifications',
    color: Colors.info,
    tint: '#E8F0FE',
  },
  system: {
    icon: 'information-circle',
    color: Colors.textSecondary,
    tint: Colors.inputBackground,
  },
};

/* ------------------------- doctor dashboard stats -------------------------- */

/** Conversation/session state label + colors for pills and filters. */
export const CONVERSATION_STATE_META: Record<
  ConversationState,
  { label: string; color: string; bg: string }
> = {
  pending: { label: 'Pending', color: '#F59E0B', bg: '#FEF3E0' },
  in_progress: { label: 'In Progress', color: '#3B82F6', bg: '#E8F0FE' },
  active: { label: 'Active', color: '#5B67F1', bg: '#EEF0FE' },
  ended: { label: 'Ended', color: '#6B7280', bg: '#F1F2F6' },
};

export type DashboardStatKey =
  | 'totalAssigned'
  | 'awaitingAction'
  | 'activeSessions'
  | 'completedSessions';

export interface StatConfig {
  key: DashboardStatKey;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

/** Doctor dashboard stat tiles. */
export const DASHBOARD_STATS: StatConfig[] = [
  {
    key: 'totalAssigned',
    label: 'Total Assigned',
    icon: 'people-outline',
    color: Colors.primary,
    bg: Colors.primarySoft,
  },
  {
    key: 'awaitingAction',
    label: 'Awaiting Action',
    icon: 'time-outline',
    color: '#F59E0B',
    bg: '#FEF3E0',
  },
  {
    key: 'activeSessions',
    label: 'Active Sessions',
    icon: 'pulse-outline',
    color: Colors.success,
    bg: Colors.successSoft,
  },
  {
    key: 'completedSessions',
    label: 'Completed',
    icon: 'checkmark-done-outline',
    color: Colors.info,
    bg: '#E8F0FE',
  },
];

/* --------------------- doctor consultations screen ------------------------- */

export type ConsultationFilterKey = 'all' | 'active' | 'ended';

/** Consultations screen — status filter chips. */
export const CONSULTATION_FILTERS: {
  key: ConsultationFilterKey;
  label: string;
}[] = [
  { key: 'all', label: 'All Requests' },
  { key: 'active', label: 'Active' },
  { key: 'ended', label: 'Ended' },
];

/* ------------------------------- auth -------------------------------------- */

/** Demo doctor credentials (from the backend seed). */
export const DOCTOR_DEMO_CREDENTIALS = {
  email: 'doctor@fountain.com',
  password: 'Doctor@123',
};

/* ------------------------------- chat -------------------------------------- */

/** Emoji picker set used in the chat composer. */
export const CHAT_EMOJIS = [
  '😀', '😂', '😊', '😍', '🤔', '👍', '🙏',
  '👋', '❤️', '😅', '🎉', '💪', '😴', '🤝',
  '✅', '⚠️', '💊', '🏥', '🩺', '📅',
];
