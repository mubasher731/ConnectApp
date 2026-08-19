import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ListItemSeparator, NotificationCard } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { mockNotificationCenter } from '../../services/mockNotificationCenter';
import { appEvents } from '../../services/appEvents';
import { AppNotification } from '../../types';
import { Colors, Spacing } from '../../theme';

const NotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // Only this user's notifications (personalized by user_id + role).
      const data = await mockNotificationCenter.listForUser(user?.id);
      if (mounted) setNotifications(data);
    };
    load()
      .catch(() => {})
      .finally(() => mounted && setLoading(false));

    // Live: prepend only notifications meant for this user.
    const off = appEvents.on('notification', (n) => {
      if (n.userId !== undefined && n.userId !== user?.id) return;
      setNotifications((prev) => [n, ...prev.filter((x) => x.id !== n.id)]);
    });

    return () => {
      mounted = false;
      off();
    };
  }, [user?.id]);

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
});

export default NotificationsScreen;
