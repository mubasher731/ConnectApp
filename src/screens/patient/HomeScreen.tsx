import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AppIcon, AppointmentCard, Avatar, EmptyState } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { chatService, sessionService } from '../../services/dataService';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { Chat } from '../../types';
import { Colors, Radius, Shadows, Spacing, responsiveSize, wp, ms, fs } from '../../theme';

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Re-fetches sessions/chats from the backend. Lets the user refresh
  // without having to close & reopen the app (e.g. when a session is set).
  const loadChats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await chatService.getChats();
      setRecentChats(data);
    } catch {
      setRecentChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const { notifications } = await sessionService.getNotifications();
      setUnreadCount(notifications.filter((n: any) => !n.isRead).length);
    } catch {
      // ignore
    }
  }, []);

  // Live real-time refresh whenever backend data changes over the socket.
  useAutoRefresh(loadChats);
  useAutoRefresh(loadNotifications);

  // Also refresh whenever the screen regains focus (e.g. after booking).
  useFocusEffect(
    useCallback(() => {
      loadChats();
      loadNotifications();
    }, [loadChats, loadNotifications])
  );

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = user?.name ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{displayName || 'Welcome'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <AppIcon name="notifications-outline" size={20} color={Colors.text} />
            {unreadCount > 0 && <View style={styles.notificationDot} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Avatar name={displayName || '?'} size={wp(34)} online />
          </TouchableOpacity>
        </View>
      </View>

      {/* Book a Consultation banner */}
      <TouchableOpacity
        style={styles.bookingBanner}
        onPress={() => navigation.navigate('Doctors')}
        activeOpacity={0.85}
      >
        <View style={styles.bookingBannerIcon}>
          <AppIcon name="medkit-outline" size={26} color={Colors.white} />
        </View>
        <View style={styles.bookingBannerText}>
          <Text style={styles.bookingBannerTitle}>Book a Consultation</Text>
          <Text style={styles.bookingBannerSub}>
            Find the right doctor and book an appointment in minutes
          </Text>
        </View>
        <View style={styles.bookingBannerArrow}>
          <AppIcon name="chevron-forward" size={20} color={Colors.white} />
        </View>
      </TouchableOpacity>

      {/* Recent Conversations */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleBlock}>
          <AppIcon name="chatbubbles-outline" size={18} color={Colors.primary} />
          <View>
            <Text style={styles.sectionTitle}>Recent Conversations</Text>
            <Text style={styles.sectionSubtitle}>Your latest consultations</Text>
          </View>
        </View>
        <View style={styles.sectionActions}>
          <TouchableOpacity
            style={styles.reloadButton}
            onPress={loadChats}
            activeOpacity={0.7}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <AppIcon name="refresh" size={18} color={Colors.primary} />
            )}
          </TouchableOpacity>
          {recentChats.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Chats')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={recentChats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AppointmentCard
            chat={item}
            onPress={() =>
              navigation.navigate('ChatDetail', {
                chatId: item.id,
                participantName: item.participantName,
              })
            }
          />
        )}
        contentContainerStyle={styles.chatList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="No sessions yet"
            message="When you start messaging your care team, your recent sessions will appear here."
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    width: wp(44),
    height: wp(44),
    borderRadius: Radius.round,
    backgroundColor: Colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: wp(8),
    height: wp(8),
    borderRadius: ms(4),
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  greeting: {
    fontSize: responsiveSize(15),
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  userName: {
    fontSize: responsiveSize(26),
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
    marginTop: ms(2),
  },
  bookingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...Shadows.primary,
  },
  bookingBannerIcon: {
    width: wp(48),
    height: wp(48),
    borderRadius: Radius.round,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  bookingBannerText: {
    flex: 1,
  },
  bookingBannerTitle: {
    fontSize: responsiveSize(17),
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.2,
  },
  bookingBannerSub: {
    fontSize: responsiveSize(12),
    color: 'rgba(255,255,255,0.85)',
    marginTop: ms(3),
    lineHeight: fs(17),
  },
  bookingBannerArrow: {
    width: wp(32),
    height: wp(32),
    borderRadius: Radius.round,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  sectionTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionSubtitle: {
    fontSize: fs(12),
    color: Colors.textTertiary,
    marginTop: ms(2),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reloadButton: {
    width: wp(32),
    height: wp(32),
    borderRadius: Radius.round,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  sectionTitle: {
    fontSize: responsiveSize(18),
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: responsiveSize(14),
    fontWeight: '600',
    color: Colors.primary,
  },
  chatList: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: ms(150),
    backgroundColor: Colors.surface,
  },
});

export default HomeScreen;
