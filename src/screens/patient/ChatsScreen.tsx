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
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services';
import { mockSessionStore, MockSession } from '../../services/mockSessionStore';
import { Chat } from '../../types';
import { Colors, Radius, Spacing, responsiveSize } from '../../theme';

/** Map an AsyncStorage mock session to a Chat row. */
const mapMockToChat = (s: MockSession, meId: number): Chat => {
  const isPatient = s.patientId === meId;
  const otherName = isPatient ? s.doctorName : s.patientName;
  const lastMessage =
    s.status === 'scheduled'
      ? 'Session scheduled'
      : s.status === 'active'
      ? 'Session active'
      : 'Session completed';
  return {
    id: s.id,
    participantId: String(isPatient ? s.doctorId : s.patientId),
    participantName: otherName,
    participantOnline: false,
    lastMessage,
    lastMessageAt: s.scheduledStart,
    unreadCount: 0,
    isTyping: false,
    status: s.status,
    durationMinutes: s.durationMinutes + s.extendedBy,
    startTime: s.scheduledStart,
    endTime: null,
    isMock: true,
  };
};

const ChatsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [mockChats, setMockChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ChatFilterKey>('all');

  const allChats = useMemo(
    () =>
      [...mockChats, ...chats].sort((a, b) =>
        b.lastMessageAt.localeCompare(a.lastMessageAt)
      ),
    [mockChats, chats]
  );

  const filteredChats = useMemo(() => {
    if (filter === 'all') return allChats;
    if (filter === 'upcoming') {
      return allChats.filter(
        (c) => c.status === 'scheduled' || c.status === 'active'
      );
    }
    if (filter === 'consulted') return allChats.filter((c) => c.status === 'completed');
    return allChats.filter((c) => c.status === 'missed');
  }, [allChats, filter]);

  // Re-fetch every time the screen gains focus (mount + returning to it), so
  // "See All" always shows the complete, fresh sessions list.
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      setLoading(true);
      chatService
        .getChats()
        .then((data) => mounted && setChats(data))
        .catch(() => mounted && setChats([]));
      // Merge AsyncStorage mock sessions (patient-doctor chats).
      mockSessionStore
        .listSessionsForUser(user?.id ?? 0)
        .then((sessions) => {
          if (!mounted) return;
          setMockChats(sessions.map((s) => mapMockToChat(s, user?.id ?? 0)));
        })
        .catch(() => {})
        .finally(() => mounted && setLoading(false));
      return () => {
        mounted = false;
      };
    }, [user?.id])
  );

  const navigateToChat = useCallback(
    (chat: Chat) =>
      navigation.navigate('ChatDetail', {
        chatId: chat.id,
        participantName: chat.participantName,
        isMock: chat.isMock,
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
        {allChats.length > 0 && (
          <Text style={styles.headerCount}>{allChats.length} conversations</Text>
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
