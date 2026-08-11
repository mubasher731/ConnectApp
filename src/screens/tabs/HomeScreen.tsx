import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import dayjs from 'dayjs';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppIcon from '../../components/AppIcon';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/dataService';
import { Chat } from '../../types';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

interface QuickAction {
  key: string;
  icon: string;
  label: string;
  tint: string;
  color: string;
  target?: 'Chats' | 'Calls' | 'Directory';
}

const STATIC_ACTIONS: QuickAction[] = [
  { key: 'chats', icon: 'chatbubble-ellipses', label: 'Messages', tint: Colors.primarySoft, color: Colors.primary, target: 'Chats' },
  { key: 'calls', icon: 'call', label: 'Calls', tint: Colors.successSoft, color: Colors.success, target: 'Calls' },
];

/** "Aug 21, 2026 • 6:47 AM" — readable timestamp for conversation cards. */
const formatChatTime = (ts: string) => {
  const d = dayjs(ts);
  return d.isValid() ? d.format('MMM D, YYYY • h:mm A') : ts || '';
};

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [recentChats, setRecentChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const displayName = user?.name ?? '';

  // Discovery is role-aware: patients browse doctors (role_id 3),
  // doctors browse patients (role_id 4).
  const isDoctor = user?.role_id === 3;
  const directoryAction: QuickAction = {
    key: 'directory',
    icon: 'people',
    label: isDoctor ? 'Patients' : 'Doctors',
    tint: '#E8F0FE',
    color: Colors.info,
    target: 'Directory',
  };
  const quickActions: QuickAction[] = [
    STATIC_ACTIONS[0],
    STATIC_ACTIONS[1],
    directoryAction,
  ];

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
            <View style={styles.notificationDot} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Avatar name={displayName || '?'} size={34} online />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={styles.actionButton}
            onPress={() => {
              if (action.target === 'Directory') {
                navigation.navigate('Directory', {
                  roleId: isDoctor ? 4 : 3,
                  title: action.label,
                });
              } else if (action.target) {
                navigation.navigate(action.target);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.tint }]}>
              <AppIcon name={action.icon} size={22} color={action.color} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Conversations */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Conversations</Text>
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
          <TouchableOpacity
            style={styles.chatCard}
            onPress={() => navigation.navigate('ChatDetail', { chatId: item.id, participantName: item.participantName })}
            activeOpacity={0.7}
          >
            <Avatar
              name={item.participantName}
              size={50}
              online={item.participantOnline}
            />
            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>{item.participantName}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.chatTime}>{formatChatTime(item.lastMessageAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.chatList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations yet"
            message="When you start messaging your care team, your recent conversations will appear here."
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
    width: 44,
    height: 44,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  greeting: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 54,
    height: 54,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
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
    width: 32,
    height: 32,
    borderRadius: Radius.round,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  chatList: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
    paddingBottom: 110,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  chatInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
    lineHeight: 21,
  },
  chatTime: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});

export default HomeScreen;
