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
  Image,
  Linking,
} from 'react-native';
import dayjs from 'dayjs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { AppIcon, Avatar, EmptyState, SessionExtensionAlert } from '../../components';
import { socketService } from '../../api/socket';
import { getApiBaseUrl } from '../../api/config';
import { useAuth } from '../../context/AuthContext';
import { CHAT_EMOJIS } from '../../context/appData';
import { chatService, sessionService } from '../../services';
import { Conversation, Message } from '../../types';
import { Colors, Radius, Shadows, Spacing, responsiveSize } from '../../theme';

interface ChatDetailScreenProps {
  route: any;
  navigation: any;
}

const formatTime = (ts: string) =>
  dayjs(ts).isValid() ? dayjs(ts).format('hh:mm A') : ts;

/** Absolute URL for a backend-relative media path. */
const mediaFullUrl = (u?: string | null): string | null => {
  if (!u) return null;
  return u.startsWith('http') ? u : `${getApiBaseUrl()}${u}`;
};

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
      <Text style={styles.headerTitleName}>{name}</Text>
      <Text style={styles.headerTitleStatus}>{online ? 'online' : 'offline'}</Text>
    </View>
  </View>
);

const ChatDetailScreen: React.FC<ChatDetailScreenProps> = ({ route, navigation }) => {
  const headerHeight = useHeaderHeight();
  const { chatId, participantName } = route.params ?? {};
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [online, setOnline] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [showExtension, setShowExtension] = useState(false);
  const [extensionSecondsLeft, setExtensionSecondsLeft] = useState(60);
  const extensionFiredForEnd = useRef<number | null>(null);
  const listRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const peerUserIdRef = useRef<number | null>(null);

  const isDoctorRole = user?.role_id === 3;

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

  // Load conversation + messages, join the room, subscribe to real-time events.
  useEffect(() => {
    if (!chatId) return;
    let mounted = true;

    const load = async () => {
      try {
        const conv = await sessionService.getConversation(String(chatId));
        if (mounted && conv) {
          setConversation(conv);
          peerUserIdRef.current = conv.peer_user_id ?? null;
        }
      } catch {
        // ignore — messages may still load
      }
      try {
        const msgs = await chatService.getMessages(chatId);
        if (mounted) setMessages(msgs);
      } catch {
        if (mounted) setMessages([]);
      }
    };
    load();
    socketService.joinSession(chatId);

    const socket = socketService.getSocket();
    const mapIncoming = (raw: any): Message => {
      const isPatient = user?.role_id === 4;
      const role = raw.role ?? 'patient';
      const sentByMe = (role === 'patient') === isPatient;
      return {
        id: raw.id ?? `s-${Date.now()}`,
        sessionId: raw.conversation_id ?? chatId,
        senderId: sentByMe ? user?.id ?? 0 : 0,
        senderRole: role,
        text: raw.content ?? '',
        type: raw.type ?? 'text',
        createdAt: raw.created_at ?? new Date().toISOString(),
        isRead: raw.is_read === true || raw.status === 'read',
        sentByMe,
        mediaUrl: raw.media_url ?? null,
      };
    };

    // The backend wraps every socket payload in `{ data: {...} }`.
    const unwrap = (payload: any) => payload?.data ?? payload;

    const onNewMessage = (payload: any) => {
      if (!mounted) return;
      const raw = unwrap(payload);
      const id = raw.id ?? `s-${Date.now()}`;
      setMessages((prev) =>
        prev.some((m) => String(m.id) === String(id))
          ? prev
          : [...prev, mapIncoming(raw)]
      );
    };
    const onTyping = (payload: any) => {
      const { conversationId, isTyping } = unwrap(payload);
      if (conversationId !== undefined && String(conversationId) !== String(chatId)) return;
      setOtherTyping(!!isTyping);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (isTyping) {
        typingTimeout.current = setTimeout(() => setOtherTyping(false), 3000);
      }
    };
    const onSessionTimer = (payload: any) => {
      const { conversationId, state } = unwrap(payload);
      if (conversationId !== undefined && String(conversationId) !== String(chatId)) return;
      if (state === 'active' || state === 'in_progress') {
        setChatDisabled(false);
        setSessionNotice(null);
      }
    };
    const onSessionEnded = (payload: any) => {
      const { conversationId } = unwrap(payload);
      if (conversationId !== undefined && String(conversationId) !== String(chatId)) return;
      setChatDisabled(true);
      setSessionNotice('Session ended');
    };
    const onUserOnline = (payload: any) => {
      const { userId, online: isOnline } = unwrap(payload);
      if (userId !== undefined && userId === peerUserIdRef.current) setOnline(!!isOnline);
    };
    const onUserJoined = (payload: any) => {
      const { userId } = unwrap(payload);
      if (userId !== undefined && userId === peerUserIdRef.current) setOnline(true);
    };
    const onUserLeft = (payload: any) => {
      const { userId } = unwrap(payload);
      if (userId !== undefined && userId === peerUserIdRef.current) setOnline(false);
    };
    const onChatDecision = (payload: any) => {
      const { conversation_id, status } = unwrap(payload);
      if (conversation_id !== undefined && String(conversation_id) !== String(chatId)) return;
      if (status === 'approved') {
        // Doctor approved → session moves to in_progress ("Starts in" countdown).
        setConversation((prev) => (prev ? { ...prev, state: 'in_progress' } : prev));
        setSessionNotice('Request approved — session scheduled');
      } else if (status === 'rescheduled') {
        setSessionNotice('Request rescheduled by the doctor');
      } else if (status === 'rejected') {
        setConversation((prev) => (prev ? { ...prev, state: 'ended' } : prev));
        setSessionNotice('Request rejected by the doctor');
      }
    };

    socket?.on('new-message', onNewMessage);
    socket?.on('typing', onTyping);
    socket?.on('session-timer-update', onSessionTimer);
    socket?.on('session-ended', onSessionEnded);
    socket?.on('user-online', onUserOnline);
    socket?.on('user-joined', onUserJoined);
    socket?.on('user-left', onUserLeft);
    socket?.on('chat-decision', onChatDecision);

    return () => {
      mounted = false;
      socket?.off('new-message', onNewMessage);
      socket?.off('typing', onTyping);
      socket?.off('session-timer-update', onSessionTimer);
      socket?.off('session-ended', onSessionEnded);
      socket?.off('user-online', onUserOnline);
      socket?.off('user-joined', onUserJoined);
      socket?.off('user-left', onUserLeft);
      socket?.off('chat-decision', onChatDecision);
      socketService.leaveSession(chatId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, user?.id]);

  // Tick once per second to drive the countdown timer.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ---- Countdown + input locking (derived from conversation timings) ----
  const scheduledAtMs = conversation?.scheduled_start
    ? dayjs(conversation.scheduled_start).valueOf()
    : null;
  const endAtMs = conversation?.scheduled_end
    ? dayjs(conversation.scheduled_end).valueOf()
    : null;

  const state = conversation?.state ?? null;
  const isPending = state === 'pending';
  const isBeforeStart =
    !isPending && scheduledAtMs !== null && now < scheduledAtMs;
  const hasEnded =
    state === 'ended' || (endAtMs !== null && now >= endAtMs);
  const locked =
    chatDisabled || !conversation || isPending || isBeforeStart || hasEnded;

  // State-driven banner: pending → awaiting approval; in_progress → starts in;
  // active → remaining; ended → ended.
  let countdownLabel: string | null = null;
  let countdownTone: 'start' | 'remaining' | 'ended' = 'remaining';
  if (isPending) {
    countdownLabel = 'Awaiting doctor approval';
    countdownTone = 'start';
  } else if (state === 'ended') {
    countdownLabel = 'Session ended';
    countdownTone = 'ended';
  } else if (state === 'in_progress' && scheduledAtMs !== null) {
    const secs = Math.max(0, Math.ceil((scheduledAtMs - now) / 1000));
    countdownLabel = `Starts in ${formatCountdown(secs)}`;
    countdownTone = 'start';
  } else if (state === 'active' && endAtMs !== null) {
    const secs = Math.max(0, Math.ceil((endAtMs - now) / 1000));
    countdownLabel = secs === 0 ? 'Session ended' : `${formatCountdown(secs)} remaining`;
    countdownTone = secs === 0 ? 'ended' : 'remaining';
  } else if (endAtMs !== null) {
    const secs = Math.max(0, Math.ceil((endAtMs - now) / 1000));
    countdownLabel =
      now >= endAtMs ? 'Session ended' : `${formatCountdown(secs)} remaining`;
    countdownTone = now >= endAtMs ? 'ended' : 'remaining';
  }

  const inputPlaceholder = !locked
    ? 'Type a message'
    : isPending
    ? 'Awaiting doctor approval'
    : isBeforeStart
    ? 'Session starts soon'
    : 'Session ended';

  // ---- Session extension alert (doctor, 1 minute before end) ----
  useEffect(() => {
    if (!isDoctorRole || endAtMs === null) return;
    const remaining = endAtMs - now;
    if (remaining > 60_000) {
      extensionFiredForEnd.current = null;
      return;
    }
    if (remaining <= 0) return; // already ended — no alert
    if (extensionFiredForEnd.current !== endAtMs) {
      extensionFiredForEnd.current = endAtMs;
      setExtensionSecondsLeft(Math.max(1, Math.ceil(remaining / 1000)));
      setShowExtension(true);
    }
  }, [now, endAtMs, isDoctorRole]);

  const handleExtensionCancel = () => setShowExtension(false);

  const handleExtend = async () => {
    setShowExtension(false);
    if (!conversation) return;
    try {
      await sessionService.extendSession(conversation.id);
    } catch {
      // Still reflect the extension locally for the demo even if the call fails.
    }
    const newEnd = dayjs().add(5, 'minute').toISOString();
    setConversation((prev) => (prev ? { ...prev, scheduled_end: newEnd } : prev));
    const sys: Message = {
      id: `sys-${Date.now()}`,
      sessionId: chatId,
      senderId: 0,
      text: 'Session extended by 5 minutes',
      type: 'system',
      createdAt: new Date().toISOString(),
      isRead: true,
      sentByMe: false,
    };
    setMessages((prev) => [...prev, sys]);
  };

  const sendMessage = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !chatId || locked) return;

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
    setMessages((prev) => [...prev, optimistic]);

    try {
      const saved = await chatService.sendMessage({ sessionId: chatId, content: trimmed });
      setMessages((prev) =>
        prev.map((m) => (m.id === localId ? { ...saved, id: saved.id } : m))
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== localId));
    }
    setInputText('');
    setShowEmoji(false);
  }, [chatId, inputText, locked, user?.id]);

  const handleChangeText = (text: string) => {
    const wasEmpty = inputText.trim().length === 0;
    const nowEmpty = text.trim().length === 0;
    setInputText(text);
    if (!chatId) return;
    const nowMs = Date.now();
    if (nowEmpty) {
      if (!wasEmpty) socketService.sendTypingStopped(chatId);
      return;
    }
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

    // Session boundary — horizontal divider separating the previous session's
    // read-only history (messages above) from the new session (below).
    if (item.type === 'session-start') {
      return (
        <View style={styles.sessionDivider}>
          <View style={styles.sessionDividerLine} />
          <Text style={styles.sessionDividerText}>
            {item.text || 'New session'}
          </Text>
          <View style={styles.sessionDividerLine} />
        </View>
      );
    }

    // System messages (e.g. "Session extended by 5 minutes") render centered.
    if (item.type === 'system') {
      return (
        <View style={styles.systemMessageRow}>
          <View style={styles.systemBubble}>
            <AppIcon name="time-outline" size={13} color={Colors.textSecondary} />
            <Text style={styles.systemText}>{item.text}</Text>
          </View>
        </View>
      );
    }

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
              {item.mediaUrl && item.type === 'photo' ? (
                <Image
                  source={{ uri: mediaFullUrl(item.mediaUrl) ?? undefined }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
              ) : item.mediaUrl ? (
                <TouchableOpacity
                  style={styles.mediaChip}
                  onPress={() =>
                    Linking.openURL(mediaFullUrl(item.mediaUrl) ?? '').catch(() => {})
                  }
                  activeOpacity={0.7}
                >
                  <AppIcon
                    name={item.type === 'voice' ? 'mic-outline' : 'document-attach-outline'}
                    size={18}
                    color={Colors.text}
                  />
                  <Text style={styles.mediaChipText}>
                    {item.type === 'voice' ? 'Voice message' : 'File attachment'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {item.text ? (
                <Text
                  style={[
                    styles.messageText,
                    item.sentByMe ? styles.sentText : styles.receivedText,
                  ]}
                >
                  {item.text}
                </Text>
              ) : null}
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
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
              {CHAT_EMOJIS.map((emoji) => (
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
                onSubmitEditing={() => sendMessage()}
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
                    color={locked ? Colors.textTertiary : showEmoji ? Colors.primary : Colors.textSecondary}
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
              onPress={() => sendMessage()}
              activeOpacity={0.85}
              disabled={locked || inputText.trim().length === 0}
            >
              <AppIcon name="arrow-up" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <SessionExtensionAlert
        visible={showExtension}
        secondsLeft={extensionSecondsLeft}
        onCancel={handleExtensionCancel}
        onExtend={handleExtend}
      />
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
    flex: 1,
  },
  headerTitleText: {
    flex: 1,
    flexShrink: 1,
    marginLeft: Spacing.sm,
  },
  headerTitleName: {
    fontSize: responsiveSize(16),
    fontWeight: '700',
    color: Colors.text,
    flexShrink: 1,
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
  sessionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  sessionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.textTertiary,
    opacity: 0.4,
  },
  sessionDividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
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
  mediaImage: {
    width: 200,
    height: 170,
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
  },
  mediaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(127,127,127,0.12)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  mediaChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm,
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
  systemMessageRow: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  systemBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  systemText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
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
    marginRight: Spacing.md,
  },
  textInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 22,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.xs,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    paddingVertical: 0,
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
