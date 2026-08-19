import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, EmptyState } from '../../components';
import { notificationService } from '../../services/dataService';
import { AppNotification, NotificationKind } from '../../types';
import { Colors, Radius, Shadows, Spacing, responsiveSize } from '../../theme';

const KIND_META: Record<
  NotificationKind,
  { icon: string; color: string; tint: string }
> = {
  message: { icon: 'chatbubble-ellipses', color: Colors.primary, tint: Colors.primarySoft },
  appointment: { icon: 'calendar', color: Colors.warning, tint: Colors.warningSoft },
  prescription: { icon: 'medkit', color: Colors.success, tint: Colors.successSoft },
  reminder: { icon: 'notifications', color: Colors.info, tint: '#E8F0FE' },
  system: { icon: 'information-circle', color: Colors.textSecondary, tint: Colors.inputBackground },
};

const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    notificationService
      .getNotifications()
      .then((data) => mounted && setNotifications(data))
      .catch(() => mounted && setNotifications([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const renderItem = ({ item }: { item: AppNotification }) => {
    const meta = KIND_META[item.kind] ?? KIND_META.system;

    return (
      <TouchableOpacity style={styles.notificationItem} activeOpacity={0.7}>
        <View style={[styles.iconContainer, { backgroundColor: meta.tint }]}>
          <AppIcon name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.time}>{item.createdAt}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={loading}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="No notifications"
            message="Updates about messages, appointments and prescriptions will appear here."
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },
  notificationItem: {
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
    width: 42,
    height: 42,
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
    fontSize: responsiveSize(15),
    fontWeight: '600',
    color: Colors.text,
    marginRight: Spacing.sm,
  },
  titleUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  body: {
    fontSize: responsiveSize(14),
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  time: {
    fontSize: responsiveSize(12),
    color: Colors.textTertiary,
  },
  separator: {
    height: Spacing.sm,
  },
});

export default NotificationsScreen;
