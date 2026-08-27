/**
 * Static / config data shared across screens.
 * Keeping constants out of screen files keeps them slim and easy to update.
 */

import { Colors } from '../theme';
import { CallDirection, ConversationState, NotificationKind } from '../types';

/* ------------------------------ patient home ------------------------------ */

/* ------------------------------ patient chats ------------------------------ */

export type ChatFilterKey = 'all' | 'upcoming' | 'consulted' | 'no_show' | 'rejected';

/** Chats tab — status filter chips. */
export const CHAT_FILTERS: { key: ChatFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'consulted', label: 'Consulted' },
  { key: 'no_show', label: 'No Show' },
  { key: 'rejected', label: 'Rejected' },
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
    tint: Colors.infoSoft,
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
  // Colors stay consistent with the patient StatusBadge:
  // Pending → Orange, In Progress/Upcoming → Yellow, Active → Green, Ended → Blue.
    pending: { label: 'Pending', color: Colors.orange, bg: Colors.orangeSoft },
    in_progress: { label: 'In Progress', color: Colors.warning, bg: Colors.warningSoft },
    active: { label: 'Active', color: Colors.success, bg: Colors.successSoft },
    ended: { label: 'Ended', color: Colors.info, bg: Colors.infoSoft },
    rejected: { label: 'Rejected', color: Colors.textSecondary, bg: 'rgba(154,163,196,0.14)' },
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
    color: Colors.warning,
    bg: Colors.warningSoft,
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
    bg: Colors.infoSoft,
  },
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
