import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppIcon from '../../components/AppIcon';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
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
  { key: 'appointments', icon: 'calendar', label: 'Appointments', tint: Colors.warningSoft, color: Colors.warning },
  { key: 'medications', icon: 'medkit', label: 'Medications', tint: '#F3E8FF', color: '#9333EA' },
];

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentChats, setRecentChats] = useState<Chat[]>([]);

  useEffect(() => {
    chatService
      .getChats()
      .then(setRecentChats)
      .catch(() => setRecentChats([]));
  }, []);

  const filteredChats = recentChats.filter(
    (chat) =>
      chat.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    STATIC_ACTIONS[2],
    STATIC_ACTIONS[3],
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <AppIcon name="search-outline" size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations"
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <AppIcon name="close-circle" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActions}
      >
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
      </ScrollView>

      {/* Recent Conversations */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Conversations</Text>
        {recentChats.length > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('Chats')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredChats}
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
                <Text style={styles.chatName} numberOfLines={1}>
                  {item.participantName}
                </Text>
                <Text style={styles.chatTime}>{item.lastMessageAt}</Text>
              </View>
              <View style={styles.chatPreview}>
                <Text style={styles.chatMessage} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
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
  searchContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    marginLeft: Spacing.md,
    paddingVertical: 0,
  },
  quickActions: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    width: 68,
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
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
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  chatTime: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  chatPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.round,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default HomeScreen;
