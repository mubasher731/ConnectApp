import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../../components/Avatar';
import EmptyState from '../../components/EmptyState';
import { chatService } from '../../services/dataService';
import { Chat } from '../../types';
import { Colors, Radius, Shadows, Spacing } from '../../theme';

const ChatsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    chatService
      .getChats()
      .then((data) => mounted && setChats(data))
      .catch(() => mounted && setChats([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const navigateToChat = useCallback(
    (chat: Chat) => navigation.navigate('ChatDetail', { chatId: chat.id, participantName: chat.participantName }),
    [navigation]
  );

  const renderItem = ({ item }: { item: Chat }) => {
    const showTyping = item.isTyping;

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
            <Text style={styles.chatName} numberOfLines={1}>
              {item.participantName}
            </Text>
            <Text style={styles.chatTime}>{item.lastMessageAt}</Text>
          </View>
          <View style={styles.chatPreview}>
            {showTyping ? (
              <Text style={styles.typingText}>typing…</Text>
            ) : (
              <Text style={styles.chatMessage} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            )}
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
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
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={loading}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-ellipses-outline"
            title="No messages yet"
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
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
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
  typingText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
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
  separator: {
    height: 1,
  },
});

export default ChatsScreen;
