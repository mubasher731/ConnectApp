import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import AppIcon from './AppIcon';
import Avatar from './Avatar';
import StatusBadge from './StatusBadge';
import { Chat } from '../types';
import { Colors, Radius, Shadows, Spacing } from '../theme';

interface AppointmentCardProps {
  chat: Chat;
  onPress: () => void;
}

/** "00 Hrs 04 Mins" — session duration. */
const formatDuration = (minutes?: number) => {
  if (!minutes || minutes <= 0) return '— Hrs — Mins';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')} Hrs ${String(m).padStart(2, '0')} Mins`;
};

/** "10:24 am to 10:28 am" — start → end. */
const formatTimeRange = (chat: Chat) => {
  const start = dayjs(chat.startTime ?? chat.lastMessageAt);
  if (!start.isValid()) return 'Time to be confirmed';
  let end = chat.endTime ? dayjs(chat.endTime) : null;
  if (!end?.isValid() && chat.durationMinutes) {
    end = start.add(chat.durationMinutes, 'minute');
  }
  const startLabel = start.format('h:mm a');
  const endLabel = end?.isValid() ? end.format('h:mm a') : null;
  return endLabel ? `${startLabel} to ${endLabel}` : startLabel;
};

/** "Jul 25 2026" — session date. */
const formatDate = (ts?: string | null) => {
  const d = dayjs(ts);
  return d.isValid() ? d.format('MMM D YYYY') : '';
};

/** One shared appointment card used by Home "Recent Conversations" + Chat tab. */
const AppointmentCard: React.FC<AppointmentCardProps> = ({ chat, onPress }) => {
  const nameColor =
    chat.status === 'completed'
      ? Colors.success
      : chat.status === 'missed'
      ? Colors.error
      : Colors.primary;

  return (
    <View style={styles.card}>
      {/* Top row: status badge (left) + duration (top right, opposite side) */}
      <View style={styles.badgeRow}>
        <StatusBadge status={chat.status} />
        <View style={styles.durationRow}>
          <AppIcon name="eye-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.duration}>{formatDuration(chat.durationMinutes)}</Text>
        </View>
      </View>

      {/* Row: avatar (left) + name/time */}
      <View style={styles.topRow}>
        <Avatar name={chat.participantName} size={48} />
        <View style={styles.infoBlock}>
          <Text style={[styles.name, { color: nameColor }]} numberOfLines={1}>
            {chat.participantName}
          </Text>
          <Text style={styles.timeText}>{formatTimeRange(chat)}</Text>
        </View>
      </View>

      {/* Footer: date + DETAILS */}
      <View style={styles.footerRow}>
        <View style={styles.metaRow}>
          <AppIcon name="calendar-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.metaText}>
            {formatDate(chat.startTime ?? chat.lastMessageAt)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={onPress}
          activeOpacity={0.85}
        >
          <Text style={styles.detailsText}>DETAILS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoBlock: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duration: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  timeText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailsButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    ...Shadows.raised,
  },
  detailsText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default AppointmentCard;
