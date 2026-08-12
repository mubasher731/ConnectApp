import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import dayjs from 'dayjs';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, EmptyState, StatusBadge } from '../../components';
import { chatService } from '../../services/dataService';
import { Chat, SessionStatus } from '../../types';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

const FILTERS: { key: 'all' | SessionStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'missed', label: 'Missed' },
];

/** "Aug 21, 2026 • 6:47 AM" — readable timestamp for conversation cards. */
const formatChatTime = (ts: string) => {
  const d = dayjs(ts);
  return d.isValid() ? d.format('MMM D, YYYY • h:mm A') : ts || '';
};

const ChatsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | SessionStatus>('all');

  const filteredChats = useMemo(
    () => (filter === 'all' ? chats : chats.filter((c) => c.status === filter)),
    [chats, filter]
  );

  // Re-fetch every time the screen gains focus (mount + returning to it), so
  // "See All" always shows the complete, fresh sessions list.
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      chatService
        .getChats()
        .then((data) => mounted && setChats(data))
        .catch(() => mounted && setChats([]))
        .finally(() => mounted && setLoading(false));
      return () => {
        mounted = false;
      };
    }, [])
  );

  const navigateToChat = useCallback(
    (chat: Chat) => navigation.navigate('ChatDetail', { chatId: chat.id, participantName: chat.participantName }),
    [navigation]
  );

  const renderItem = ({ item }: { item: Chat }) => {
    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigateToChat(item)}
        activeOpacity={0.7}
      >
        <Avatar
          name={item.participantName}
          size={52}
          online={item.participantOnline}
        />
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{item.participantName}</Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={styles.chatTime}>{formatChatTime(item.lastMessageAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        {chats.length > 0 && (
          <Text style={styles.headerCount}>{chats.length} conversations</Text>
        )}
      </View>

      {/* Status filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={loading}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title={filter === 'all' ? 'No messages yet' : `No ${filter} sessions`}
            message="Your conversations with doctors, nurses and your care team will appear here."
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.round,
    backgroundColor: Colors.inputBackground,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 110,
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.card,
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  chatContent: {
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
  separator: {
    height: 1,
  },
});

export default ChatsScreen;
