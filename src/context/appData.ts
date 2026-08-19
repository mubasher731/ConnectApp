/**
 * Static / config data shared across screens.
 * Keeping constants out of screen files keeps them slim and easy to update.
 */

import { Colors } from '../theme';
import { URGENCY_META, SEVERITY_META } from '../mock/doctorData';
import { CallDirection, NotificationKind } from '../types';

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

/* ------------------------ doctor dashboard urgency filter ------------------- */

export type UrgencyFilter = 'all' | 'high' | 'medium' | 'low';

export const URGENCY_FILTER_OPTIONS: {
  value: UrgencyFilter;
  label: string;
  color: string;
}[] = [
  { value: 'all', label: 'All Urgencies', color: Colors.textTertiary },
  { value: 'high', label: 'High', color: URGENCY_META.high.color },
  { value: 'medium', label: 'Medium', color: URGENCY_META.medium.color },
  { value: 'low', label: 'Low', color: URGENCY_META.low.color },
];

/* --------------------- doctor consultations screen ------------------------- */

export type ConsultationFilterKey = 'all' | 'in_progress' | 'completed' | 'closed';

/** Consultations screen — status filter chips. */
export const CONSULTATION_FILTERS: {
  key: ConsultationFilterKey;
  label: string;
}[] = [
  { key: 'in_progress', label: 'In Progress' },
  { key: 'all', label: 'All Requests' },
  { key: 'completed', label: 'Completed' },
  { key: 'closed', label: 'Successfully closed' },
];

export type SeverityFilter = 'all' | 'mild' | 'moderate_severe' | 'severe';

/** Consultations screen — severity filter options. */
export const SEVERITY_FILTER_OPTIONS: {
  value: SeverityFilter;
  label: string;
  color: string;
}[] = [
  { value: 'all', label: 'All Severities', color: Colors.textTertiary },
  { value: 'mild', label: 'Mild', color: SEVERITY_META.mild.color },
  {
    value: 'moderate_severe',
    label: 'Moderately Severe',
    color: SEVERITY_META.moderate_severe.color,
  },
  { value: 'severe', label: 'Severe', color: SEVERITY_META.severe.color },
];

/* ------------------------------- auth -------------------------------------- */

/** Reserved demo doctor credentials (mock login until the backend is ready). */
export const DOCTOR_DEMO_CREDENTIALS = {
  email: 'doctor@fountain.com',
  password: '12345678',
};

/* ------------------------------- chat -------------------------------------- */

/** Emoji picker set used in the chat composer. */
export const CHAT_EMOJIS = [
  '😀', '😂', '😊', '😍', '🤔', '👍', '🙏',
  '👋', '❤️', '😅', '🎉', '💪', '😴', '🤝',
  '✅', '⚠️', '💊', '🏥', '🩺', '📅',
];
