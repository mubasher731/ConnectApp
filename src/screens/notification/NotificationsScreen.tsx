import React, { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { EmptyState, ListItemSeparator, NotificationCard } from '../../components';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { sessionService } from '../../services';
import { AppNotification, BackendNotification, NotificationKind } from '../../types';
import { Colors, Spacing } from '../../theme';

const kindFromType = (type: string): NotificationKind => {
  if (
    type === 'chat_request' ||
    type === 'chat-decision' ||
    type === 'Appointment Acceptance' ||
    type === 'rejected' ||
    type === 'rescheduled' ||
    type === 'schedule_update' ||
    type === 'session_started' ||
    type === 'session_ended'
  ) return 'appointment';
  if (type === 'red_flag') return 'system';
  return 'system';
};

const mapBackend = (n: BackendNotification): AppNotification => ({
  id: String(n.id),
  kind: kindFromType(n.type),
  title: n.title,
  body: n.body,
  createdAt: n.created_at,
  read: n.isRead,
});

const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { notifications: list } = await sessionService.getNotifications();
      setNotifications(list.map(mapBackend));
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh whenever the screen gains focus (mount + returning to it).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Live real-time refresh whenever backend data changes over the socket.
  useAutoRefresh(load);

  const renderItem = ({ item }: { item: AppNotification }) => (
    <NotificationCard notification={item} />
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={<ListItemSeparator />}
        refreshing={loading}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="No notifications"
            message="Updates about chat requests and appointments will appear here."
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
});

export default NotificationsScreen;
