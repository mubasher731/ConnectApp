import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ListItemSeparator, NotificationCard } from '../../components';
import { notificationService } from '../../services/dataService';
import { AppNotification } from '../../types';
import { Colors, Spacing } from '../../theme';

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
