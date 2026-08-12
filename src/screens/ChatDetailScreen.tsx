import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
} from 'react-native';
import dayjs from 'dayjs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon, Avatar, EmptyState } from '../components';
import { socketService } from '../api/socket';
import { useAuth } from '../context/AuthContext';
import { chatService, sessionService } from '../services';
import { Message, Session, SessionStatus } from '../types';
import { Colors, Radius, Shadows, Spacing } from '../theme';

interface ChatDetailScreenProps {
  route: any;
  navigation: any;
}

const EMOJIS = [
  '😀', '😂', '😊', '😍', '🤔', '👍', '🙏',
  '👋', '❤️', '😅', '🎉', '💪', '😴', '🤝',
  '✅', '⚠️', '💊', '🏥', '🩺', '📅',
];

const formatTime = (ts: string) =>
  dayjs(ts).isValid() ? dayjs(ts).format('hh:mm A') : ts;

const formatDay = (ts: string) => {
  const d = dayjs(ts);
  if (!d.isValid()) return ts;
  if (d.isSame(dayjs(), 'day')) return 'Today';
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
  return d.format('DD MMM YYYY');
};

/** mm:ss countdown formatter for the session timer. */
const formatCountdown = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/** WhatsApp-style typing indicator (3 pulsing dots). */
const TypingIndicator: React.FC = () => {
  const dots = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]).current;

  useEffect(() => {
    const animations = dots.map((value, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration: 400, delay: i * 160, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, [dots]);

  return (
    <View style={styles.typingBubble}>
      {dots.map((value, i) => (
        <Animated.View key={i} style={[styles.typingDot, { opacity: value }]} />
      ))}
    </View>
  );
};

/** Header title: avatar + name + online status. */
const ChatHeaderTitle: React.FC<{ name: string; online: boolean }> = ({ name, online }) => (
  <View style={styles.headerTitleRow}>
    <Avatar name={name || '?'} size={34} online={online} />
    <View style={styles.headerTitleText}>
      <Text style={styles.headerTitleName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.headerTitleStatus}>{online ? 'online' : 'offline'}</Text>
    </View>
  </View>
);

const ChatDetailScreen: React.FC<ChatDetailScreenProps> = ({ route, navigation }) => {
  const { chatId, participantName, participantOnline } = route.params ?? {};
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [online, setOnline] = useState(!!participantOnline);
  // Session metadata + countdown state.
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionStatus>('scheduled');
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<FlatList>(null);
  // Dedup guards: seen server message ids + unconfirmed optimistic messages.
  const seenIds = useRef<Set<string>>(new Set());
  const optimisticRef = useRef<Map<string, Message>>(new Map());
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  // Custom WhatsApp-style header (avatar + name + online status).
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <ChatHeaderTitle
          name={participantName || 'Chat'}
          online={online || otherTyping}
        />
      ),
    });
  }, [navigation, participantName, online, otherTyping]);

  useEffect(() => {
    let mounted = true;

    const loadMessages = async () => {
      try {
        const data = await chatService.getMessages(chatId);
        if (mounted) setMessages(data);
      } catch {
        if (mounted) setMessages([]);
      }
    };

    if (chatId) {
      loadMessages();
      seenIds.current.clear(); // fresh room — reset dedup set
      socketService.joinSession(chatId);
      // Join via HTTP so the server attaches us to the room and marks active.
      sessionService.joinSession(chatId, socketService.getSocket()?.id).catch(() => {});
      // Fetch session details to power the countdown + input locking.
      sessionService
        .getSession(chatId)
        .then((s) => {
          if (!mounted) return;
          setSession(s);
          if (s?.status) setStatus(s.status);
        })
        .catch(() => {});
    }

    const socket = socketService.getSocket();
    const onSessionMessage = (payload: any) => {
      if (!mounted) return;
      const raw = payload?.message ?? payload;
      const id = raw.id ?? `s-${Date.now()}`;
      // Skip any already-seen server message (dedup by id).
      if (seenIds.current.has(String(id))) return;
      seenIds.current.add(String(id));

      const incoming: Message = {
        id,
        sessionId: raw.session_id ?? chatId,
        senderId: raw.sender_id,
        senderRole: raw.sender_role,
        text: raw.message_text ?? '',
        type: raw.message_type ?? 'text',
        createdAt: raw.sent_at ?? new Date().toISOString(),
        isRead: raw.is_read,
        sentByMe: raw.sender_id === user?.id,
      };

      setMessages((prev) => {
        // Exact id already rendered — never add a second copy.
        if (prev.some((m) => m.id === id)) return prev;
        // Our own message: the server confirmed it, so replace the optimistic
        // copy (same text) instead of appending a duplicate.
        if (incoming.sentByMe) {
          const optimistic = [...optimisticRef.current.values()].find(
            (o) => o.sentByMe && o.text === incoming.text
          );
          if (optimistic) {
            optimisticRef.current.delete(String(optimistic.id));
            return prev.map((m) => (m.id === optimistic.id ? incoming : m));
          }
        }
        return [...prev, incoming];
      });
    };

    // New spec: typing/typingStopped — clear the indicator immediately on stop.
    const onTyping = ({ userId }: { userId: number | string }) => {
      if (userId === user?.id) return;
      setOtherTyping(true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => setOtherTyping(false), 3000);
    };
    const onTypingStopped = ({ userId }: { userId: number | string }) => {
      if (userId === user?.id) return;
      setOtherTyping(false);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
    const onUserPresence = ({ userId, online: isOnline }: { userId: number | string; online?: boolean }) => {
      if (userId !== user?.id && typeof isOnline === 'boolean') setOnline(isOnline);
    };

    // Session lifecycle banners.
    const onSessionStarted = () => {
      setSessionNotice('Session started');
      setStatus('active');
      setChatDisabled(false);
    };
    const onSessionEnding = () => setSessionNotice('Session ends in 1 minute');
    const onSessionEnded = () => {
      setSessionNotice('Session ended');
      setStatus('completed');
      setChatDisabled(true);
    };
    const onSessionMissed = () => {
      setSessionNotice('Session missed — nobody joined');
      setStatus('missed');
      setChatDisabled(true);
    };
    const onUserJoined = ({ userRole }: { userRole?: string }) => {
      if (userRole) {
        setSessionNotice(`${userRole === 'doctor' ? 'Doctor' : 'Patient'} joined the session`);
      }
    };

    socket?.on('sessionMessage', onSessionMessage);
    socket?.on('typing', onTyping);
    socket?.on('typingStopped', onTypingStopped);
    socket?.on('userPresence', onUserPresence);
    socket?.on('sessionStarted', onSessionStarted);
    socket?.on('sessionEnding', onSessionEnding);
    socket?.on('sessionEnded', onSessionEnded);
    socket?.on('sessionMissed', onSessionMissed);
    socket?.on('userJoined', onUserJoined);

    return () => {
      mounted = false;
      socket?.off('sessionMessage', onSessionMessage);
      socket?.off('typing', onTyping);
      socket?.off('typingStopped', onTypingStopped);
      socket?.off('userPresence', onUserPresence);
      socket?.off('sessionStarted', onSessionStarted);
      socket?.off('sessionEnding', onSessionEnding);
      socket?.off('sessionEnded', onSessionEnded);
      socket?.off('sessionMissed', onSessionMissed);
      socket?.off('userJoined', onUserJoined);
      if (chatId) socketService.leaveSession(chatId);
    };
  }, [chatId, user?.id]);

  // Tick once per second to drive the real-time countdown timer.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ---- Countdown + input locking (derived from session metadata) ----
  const durationMs = (session?.duration_minutes ?? 0) * 60 * 1000;
  const scheduledAt = session?.scheduled_start ? dayjs(session.scheduled_start) : null;
  const startAt = session?.actual_start ? dayjs(session.actual_start) : null;
  const endAtMs = startAt
    ? startAt.valueOf() + durationMs
    : scheduledAt
    ? scheduledAt.valueOf() + durationMs
    : null;

  const isBeforeStart = !!scheduledAt && status === 'scheduled' && now < scheduledAt.valueOf();
  const hasEnded = endAtMs !== null && now >= endAtMs;
  // Locked until the session officially starts; unlocks while active and
  // locks again the moment the timer reaches zero.
  const locked = chatDisabled || !session || isBeforeStart || hasEnded;

  let countdownLabel: string | null = null;
  let countdownTone: 'start' | 'remaining' | 'ended' = 'remaining';
  if (isBeforeStart && scheduledAt) {
    const secs = Math.max(0, Math.ceil((scheduledAt.valueOf() - now) / 1000));
    countdownLabel = `Starts in ${formatCountdown(secs)}`;
    countdownTone = 'start';
  } else if (endAtMs !== null) {
    const secs = Math.max(0, Math.ceil((endAtMs - now) / 1000));
    if (hasEnded) {
      countdownLabel = 'Session ended';
      countdownTone = 'ended';
    } else {
      countdownLabel = `${formatCountdown(secs)} remaining`;
      countdownTone = 'remaining';
    }
  }

  const inputPlaceholder = !locked
    ? 'Type a message'
    : isBeforeStart
    ? 'Session starts soon'
    : 'Session ended';

  const sendMessage = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || !chatId || chatDisabled || !session || isBeforeStart || hasEnded) return;

    socketService.sendTypingStopped(chatId);
    const localId = `local-${Date.now()}`;
    const optimistic: Message = {
      id: localId,
      sessionId: chatId,
      senderId: user?.id ?? 0,
      text: trimmed,
      type: 'text',
      createdAt: new Date().toISOString(),
      sentByMe: true,
    };
    optimisticRef.current.set(localId, optimistic);
    setMessages((prev) => [...prev, optimistic]);

    // Send via REST (session must be active); remove the optimistic copy on failure.
    chatService
      .sendMessage({ sessionId: chatId, content: trimmed })
      .catch(() => {
        optimisticRef.current.delete(localId);
        setMessages((prev) => prev.filter((m) => m.id !== localId));
      });

    setInputText('');
    setShowEmoji(false);
  }, [chatId, inputText, chatDisabled, user?.id, session, isBeforeStart, hasEnded]);

  const handleChangeText = (text: string) => {
    const wasEmpty = inputText.trim().length === 0;
    const nowEmpty = text.trim().length === 0;
    setInputText(text);
    if (!chatId) return;

    const nowMs = Date.now();
    if (nowEmpty) {
      // Emit typingStopped when the composer is cleared.
      if (!wasEmpty) socketService.sendTypingStopped(chatId);
      return;
    }
    // Throttle typing signals to ~1/s (spec requirement).
    if (wasEmpty || nowMs - lastTypingSent.current > 1000) {
      lastTypingSent.current = nowMs;
      socketService.sendTyping(chatId);
    }
  };

  const insertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const prev = messages[index - 1];
    const showDate = !prev || !dayjs(item.createdAt).isSame(dayjs(prev.createdAt), 'day');
    const isGroupStart = !prev || prev.sentByMe !== item.sentByMe || showDate;
    const grouped = !isGroupStart;

    return (
      <View>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>{formatDay(item.createdAt)}</Text>
          </View>
        )}
        <View
          style={[
            styles.messageRow,
            item.sentByMe ? styles.messageRowSent : styles.messageRowReceived,
            grouped && styles.messageRowGrouped,
          ]}
        >
          {!item.sentByMe && (
            <View style={styles.avatarSlot}>
              {isGroupStart ? <Avatar name={participantName || '?'} size={30} /> : null}
            </View>
          )}
          <View style={styles.messageContent}>
            <View
              style={[
                styles.messageBubble,
                item.sentByMe ? styles.sentBubble : styles.receivedBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  item.sentByMe ? styles.sentText : styles.receivedText,
                ]}
              >
                {item.text}
              </Text>
              <View style={styles.bubbleMeta}>
                <Text
                  style={[
                    styles.bubbleTime,
                    item.sentByMe ? styles.sentTimeText : styles.receivedTimeText,
                  ]}
                >
                  {formatTime(item.createdAt)}
                </Text>
                {item.sentByMe && (
                  <View style={styles.checkIcon}>
                    <AppIcon name="checkmark-done" size={14} color={Colors.white} />
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderTyping = () => {
    if (!otherTyping) return null;
    return (
      <View style={styles.typingRow}>
        <View style={styles.avatarSlot}>
          <Avatar name={participantName || '?'} size={30} />
        </View>
        <TypingIndicator />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Session countdown + lifecycle notices — pinned below the chat header */}
        {countdownLabel || sessionNotice ? (
          <View>
            {countdownLabel ? (
              <View
                style={[
                  styles.countdownBanner,
                  countdownTone === 'start' && styles.countdownBannerStart,
                  countdownTone === 'ended' && styles.countdownBannerEnded,
                ]}
              >
                <AppIcon
                  name="timer-outline"
                  size={16}
                  color={
                    countdownTone === 'start'
                      ? Colors.info
                      : countdownTone === 'ended'
                      ? Colors.error
                      : Colors.success
                  }
                />
                <Text
                  style={[
                    styles.countdownText,
                    countdownTone === 'start' && styles.countdownTextStart,
                    countdownTone === 'ended' && styles.countdownTextEnded,
                  ]}
                >
                  {countdownLabel}
                </Text>
              </View>
            ) : null}
            {sessionNotice ? (
              <View style={styles.noticeBanner}>
                <AppIcon name="information-circle-outline" size={16} color={Colors.warning} />
                <Text style={styles.noticeText}>{sessionNotice}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={renderTyping}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubble-outline"
              title="Start the conversation"
              message="Say hello to start your consultation. Messages arrive here in real time."
            />
          }
        />

        {/* Composer */}
        <View style={styles.inputContainer}>
          {showEmoji && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.emojiStrip}
            >
              {EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiItem}
                  onPress={() => insertEmoji(emoji)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.inputRow}>
            <View style={[styles.textInputWrapper, locked && styles.inputWrapperDisabled]}>
              <TextInput
                style={styles.textInput}
                placeholder={inputPlaceholder}
                placeholderTextColor={Colors.textTertiary}
                value={inputText}
                onChangeText={handleChangeText}
                multiline
                maxLength={500}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
                editable={!locked}
              />
              <View style={styles.inputActions}>
                <TouchableOpacity
                  style={[styles.inputAction, showEmoji && styles.inputActionActive]}
                  onPress={() => setShowEmoji((s) => !s)}
                  activeOpacity={0.6}
                  disabled={locked}
                >
                  <AppIcon
                    name={showEmoji ? 'close' : 'happy-outline'}
                    size={20}
                    color={chatDisabled ? Colors.textTertiary : showEmoji ? Colors.primary : Colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.roundButton,
                styles.sendButton,
                locked && styles.buttonDisabled,
                inputText.trim().length === 0 && styles.buttonDisabled,
              ]}
              onPress={sendMessage}
              activeOpacity={0.85}
              disabled={locked || inputText.trim().length === 0}
            >
              <AppIcon name="arrow-up" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleText: {
    marginLeft: Spacing.sm,
  },
  headerTitleName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    maxWidth: 200,
  },
  headerTitleStatus: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
  },
  messagesList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    borderRadius: Radius.round,
    overflow: 'hidden',
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.warningSoft,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  countdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successSoft,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  countdownBannerStart: {
    backgroundColor: '#E8F0FE',
  },
  countdownBannerEnded: {
    backgroundColor: Colors.errorSoft,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.success,
    marginLeft: Spacing.sm,
  },
  countdownTextStart: {
    color: Colors.info,
  },
  countdownTextEnded: {
    color: Colors.error,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.warning,
    marginLeft: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  inputWrapperDisabled: {
    opacity: 0.6,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    alignItems: 'flex-end',
  },
  messageRowGrouped: {
    marginBottom: 2,
  },
  messageRowSent: {
    justifyContent: 'flex-end',
  },
  messageRowReceived: {
    justifyContent: 'flex-start',
  },
  avatarSlot: {
    width: 30,
    marginRight: Spacing.sm,
    alignItems: 'center',
  },
  messageContent: {
    maxWidth: '70%',
  },
  messageBubble: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Shadows.card,
  },
  sentBubble: {
    backgroundColor: Colors.chatBubbleSent,
    borderBottomRightRadius: 6,
  },
  receivedBubble: {
    backgroundColor: Colors.chatBubbleReceived,
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  sentText: {
    color: Colors.white,
  },
  receivedText: {
    color: Colors.text,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  bubbleTime: {
    fontSize: 11,
    fontWeight: '400',
  },
  sentTimeText: {
    color: 'rgba(255,255,255,0.8)',
  },
  receivedTimeText: {
    color: Colors.textTertiary,
  },
  checkIcon: {
    marginLeft: 3,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: Colors.chatBubbleReceived,
    borderRadius: Radius.lg,
    borderBottomLeftRadius: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    ...Shadows.card,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginHorizontal: 3,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.primary,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
  },
  emojiStrip: {
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  emojiItem: {
    paddingHorizontal: Spacing.xs,
  },
  emojiText: {
    fontSize: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.round,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginBottom: 2,
  },
  sendButton: {
    backgroundColor: Colors.white,
    marginLeft: Spacing.sm,
    marginRight: 0,
  },
  textInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.white,
    borderRadius: 22,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.xs,
    paddingVertical: 6,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    paddingVertical: 4,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputAction: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputActionActive: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radius.round,
  },
});

export default ChatDetailScreen;
