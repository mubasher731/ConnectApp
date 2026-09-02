import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import AppIcon from '../Icon/AppIcon';
import { NOTIFICATION_KIND_META } from '../../context/appData';
import { AppNotification } from '../../types';
import { Colors, Radius, Shadows, Spacing, wp, fs } from '../../theme';

dayjs.extend(relativeTime);

interface NotificationCardProps {
  notification: AppNotification;
  onPress?: () => void;
}

/** Single notification row: kind icon, title, body, timestamp. */
const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
}) => {
  const meta = NOTIFICATION_KIND_META[notification.kind] ?? NOTIFICATION_KIND_META.system;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: meta.tint }]}>
        <AppIcon name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, !notification.read && styles.titleUnread]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          {!notification.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.body} numberOfLines={2}>
          {notification.body}
        </Text>
        <Text style={styles.time}>{dayjs(notification.createdAt).fromNow()}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  iconContainer: {
    width: wp(42),
    height: wp(42),
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: fs(15),
    fontWeight: '600',
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  titleUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: Colors.primary,
  },
  body: {
    fontSize: fs(14),
    color: Colors.textSecondary,
    lineHeight: fs(20),
    marginBottom: Spacing.sm,
  },
  time: {
    fontSize: fs(12),
    color: Colors.textTertiary,
  },
});

export default NotificationCard;
