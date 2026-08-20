import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppointmentCard, EmptyState } from '../../components';
import { CHAT_FILTERS, ChatFilterKey } from '../../context/appData';
import { chatService } from '../../services';
import { Chat } from '../../types';
import { Colors, Radius, Spacing, responsiveSize } from '../../theme';

const ChatsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ChatFilterKey>('all');

  const filteredChats = useMemo(() => {
    if (filter === 'all') return chats;
    if (filter === 'upcoming') {
      return chats.filter(
        (c) => c.status === 'scheduled' || c.status === 'active'
      );
    }
    if (filter === 'consulted') return chats.filter((c) => c.status === 'completed');
    return chats.filter((c) => c.status === 'missed');
  }, [chats, filter]);

  // Re-fetch every time the screen gains focus (mount + returning to it), so
  // the list always shows the complete, fresh conversations.
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
    (chat: Chat) =>
      navigation.navigate('ChatDetail', {
        chatId: chat.id,
        participantName: chat.participantName,
      }),
    [navigation]
  );

  const renderItem = ({ item }: { item: Chat }) => (
    <AppointmentCard chat={item} onPress={() => navigateToChat(item)} />
  );

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
        {CHAT_FILTERS.map((f) => {
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
        refreshing={loading}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={filter === 'all' ? 'No sessions yet' : 'No sessions found'}
            message="Your sessions with doctors, nurses and your care team will appear here."
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
    fontSize: responsiveSize(28),
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: responsiveSize(14),
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
    fontSize: responsiveSize(13),
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: 110,
    flexGrow: 1,
    backgroundColor: Colors.surface,
  },
});

export default ChatsScreen;
