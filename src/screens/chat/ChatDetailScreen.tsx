import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  ScrollView,
  Image,
  Modal,
  Linking,
  Keyboard,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import dayjs from 'dayjs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { pick, types, errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import Sound from 'react-native-nitro-sound';
import { AppIcon, Avatar, EmptyState, SessionExtensionAlert, useAlert } from '../../components';
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

/** Label for the divider that opens a new session block. */
const sessionDividerLabel = (item: Message): string => {
  const d = dayjs(item.createdAt);
  if (d.isValid()) {
    const time = d.format('h:mm A');
    if (d.isSame(dayjs(), 'day')) return `Today's Session • ${time}`;
    if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return `Yesterday's Session • ${time}`;
    return `${d.format('DD MMM YYYY')} Session • ${time}`;
  }
  return item.text || 'New session';
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
  const { chatId, participantName } = route.params ?? {};
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [chatDisabled, setChatDisabled] = useState(false);
  const [online, setOnline] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [showExtension, setShowExtension] = useState(false);
  const [extensionSecondsLeft, setExtensionSecondsLeft] = useState(60);
  const [endingSession, setEndingSession] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voicePosition, setVoicePosition] = useState(0);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [attachOpen, setAttachOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 50;
  const recordingRef = useRef<{ start: number; timer: ReturnType<typeof setInterval> | null }>({
    start: 0,
    timer: null,
  });
  const playingVoiceIdRef = useRef<string | null>(null);
  const voiceDurationsRef = useRef<Record<string, number>>({});
  const extensionFiredForEnd = useRef<number | null>(null);
  const listRef = useRef<FlatList>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const peerUserIdRef = useRef<number | null>(null);

  // Load the next older page when the user scrolls to the top of the list.
  const loadOlder = useCallback(async () => {
    if (!chatId || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const older = await chatService.getMessages(chatId, {
        limit: PAGE_SIZE,
        skip: messages.length,
      });
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => String(m.id)));
        return [...older.filter((m) => !seen.has(String(m.id))), ...prev];
      });
      setHasMore(older.length >= PAGE_SIZE);
    } catch (e) {
      console.log('loadOlder failed:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [chatId, hasMore, loadingMore, messages.length, PAGE_SIZE]);

  const isDoctorRole = user?.role_id === 3;

  // Prefer the route-passed name, but if it's missing/generic (e.g. opened
  // from a notification), resolve the real peer name from the conversation.
  const effectiveName = resolvedName ?? participantName ?? '';
  useEffect(() => {
    if (!conversation) return;
    const cur = (participantName ?? '').trim().toLowerCase();
    const generic = !cur || ['doctor', 'patient', 'chat'].includes(cur);
    if (!generic) return;
    const peerName =
      user?.role_id === 4 ? conversation.doctor_name : conversation.patient_name;
    if (peerName) setResolvedName(peerName);
  }, [conversation, participantName, user?.role_id]);

  // Custom WhatsApp-style header (avatar + name + online status).
  useEffect(() => {
    navigation.setOptions({
      // react-navigation's headerTitle render prop is a false positive here.
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <ChatHeaderTitle
          name={effectiveName || 'Chat'}
          online={online || otherTyping}
        />
      ),
    });
  }, [navigation, effectiveName, online, otherTyping]);

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
        const msgs = await chatService.getMessages(chatId, { limit: PAGE_SIZE, skip: 0 });
        if (mounted) {
          setMessages(msgs);
          setHasMore(msgs.length >= PAGE_SIZE);
        }
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
      const { conversationId, state, remainingTime } = unwrap(payload);
      if (conversationId !== undefined && String(conversationId) !== String(chatId)) return;
      if (state === 'active' || state === 'in_progress') {
        setChatDisabled(false);
        setSessionNotice(null);
        // Move the end time forward to match the server's remaining time, so a
        // doctor's extension reaches the patient instantly instead of the
        // patient's end time staying stuck at the original schedule.
        if (typeof remainingTime === 'number' && remainingTime > 0) {
          const serverEnd = new Date(Date.now() + remainingTime).toISOString();
          setConversation((prev) =>
            prev && dayjs(serverEnd).valueOf() > dayjs(prev.scheduled_end).valueOf()
              ? { ...prev, scheduled_end: serverEnd }
              : prev
          );
        }
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

  // Track the keyboard height so the composer stays above it. Bottom padding is
  // applied on every platform because Android uses windowSoftInputMode="adjustNothing"
  // (set in AndroidManifest.xml), so the window never auto-resizes — behavior is
  // consistent across all Android devices and there is no double-counting.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Voice playback: keep position/duration in sync, cache durations per note,
  // clear the playing state when a note finishes, and stop playback on unmount.
  useEffect(() => {
    Sound.addPlayBackListener((meta) => {
      // The native library reports duration/position in MILLISECONDS.
      const posSecs = meta.currentPosition / 1000;
      const durSecs = meta.duration / 1000;
      setVoicePosition(posSecs);
      setVoiceDuration(durSecs);
      const id = playingVoiceIdRef.current;
      if (id) voiceDurationsRef.current[id] = durSecs;
    });
    Sound.addPlaybackEndListener(() => {
      setPlayingVoiceId(null);
      playingVoiceIdRef.current = null;
      setVoicePosition(0);
    });
    return () => {
      Sound.removePlayBackListener();
      Sound.removePlaybackEndListener();
      Sound.stopPlayer().catch(() => {});
    };
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
    // The alert belongs only to the active session window. Once the session is
    // completed (backend state) or its scheduled end has passed, dismiss any
    // visible alert and never fire it again.
    if (state === 'ended' || now >= endAtMs) {
      if (extensionFiredForEnd.current !== null) {
        extensionFiredForEnd.current = null;
        setShowExtension(false);
      }
      return;
    }
    const remaining = endAtMs - now;
    if (remaining > 60_000) {
      extensionFiredForEnd.current = null;
      return;
    }
    // Within the final minute of the active window: fire once per end time.
    if (extensionFiredForEnd.current !== endAtMs) {
      extensionFiredForEnd.current = endAtMs;
      setExtensionSecondsLeft(Math.max(1, Math.ceil(remaining / 1000)));
      setShowExtension(true);
    }
  }, [now, endAtMs, isDoctorRole, state]);

  const handleExtensionCancel = () => setShowExtension(false);

  const handleExtend = async () => {
    setShowExtension(false);
    if (!conversation) return;
    let res: any;
    try {
      res = await sessionService.extendSession(conversation.id);
    } catch (err) {
      // Only reflect the extension if the backend actually applied it —
      // otherwise the UI would desync from the server.
      showAlert({
        title: 'Extension Failed',
        message:
          err instanceof Error && err.message
            ? err.message
            : 'Could not extend the session. Please try again.',
        actions: [{ text: 'OK' }],
      });
      return;
    }
    // Prefer the server's real updated end time (original end + 5 min) over
    // guessing "now + 5 min", which drifted from the backend.
    const serverEnd: string | undefined = res?.data?.scheduled_end;
    const newEnd = serverEnd ?? dayjs().add(5, 'minute').toISOString();
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

  // ---- Doctor: end the active session early ----
  const canEndSession =
    isDoctorRole && !!conversation && conversation.state === 'active' && !hasEnded;

  const handleEndSession = useCallback(async () => {
    if (!conversation || endingSession) return;
    setEndingSession(true);
    try {
      await sessionService.endSession(conversation.id);
      // Reflect the ended state immediately; the socket event will confirm it.
      setConversation((prev) => (prev ? { ...prev, state: 'ended' } : prev));
      setShowExtension(false);
      extensionFiredForEnd.current = null;
      showAlert({
        title: 'Session Ended',
        message: 'This session has been ended.',
        actions: [{ text: 'OK' }],
      });
    } catch (err) {
      showAlert({
        title: 'Could Not End Session',
        message:
          err instanceof Error ? err.message : 'Unable to end the session. Please try again.',
        actions: [{ text: 'OK' }],
      });
    } finally {
      setEndingSession(false);
    }
  }, [conversation, endingSession, showAlert]);

  const confirmEndSession = useCallback(() => {
    showAlert({
      title: 'End Session',
      message: 'End this session now? This cannot be undone.',
      actions: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End Session', style: 'destructive', onPress: () => handleEndSession() },
      ],
    });
  }, [showAlert, handleEndSession]);

  // Header "End Session" action — doctor only, while the session is active.
  useEffect(() => {
    navigation.setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () =>
        canEndSession ? (
          <TouchableOpacity
            style={styles.headerEndButton}
            onPress={confirmEndSession}
            disabled={endingSession}
            activeOpacity={0.7}
          >
            {endingSession ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <>
                <AppIcon name="stop-circle-outline" size={16} color={Colors.error} />
                <Text style={styles.headerEndText}>End Session</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, canEndSession, endingSession, confirmEndSession]);

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

  // ---- Media (photo / file / voice) ----
  const sendMedia = useCallback(
    async (
      file: any,
      type: 'photo' | 'file' | 'voice',
      content?: string,
      durationSecs?: number
    ) => {
      if (!chatId || locked || sendingMedia) return;
      setSendingMedia(true);
      const localId = `local-${Date.now()}`;
      const optimistic: Message = {
        id: localId,
        sessionId: chatId,
        senderId: user?.id ?? 0,
        text: content ?? '',
        type,
        createdAt: new Date().toISOString(),
        sentByMe: true,
        mediaUrl: file?.uri ?? null,
        durationSecs,
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        const saved = await chatService.sendMessage({
          sessionId: chatId,
          content,
          type,
          files: [file],
        });
        // Keep the recorded duration — the backend response has no duration field.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === localId
              ? { ...saved, id: saved.id, durationSecs: durationSecs ?? m.durationSecs }
              : m
          )
        );
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== localId));
        showAlert({
          title: 'Send Failed',
          message:
            err instanceof Error && err.message
              ? err.message
              : 'Could not send the file.',
          actions: [{ text: 'OK' }],
        });
      } finally {
        setSendingMedia(false);
      }
    },
    [chatId, locked, sendingMedia, user?.id]
  );

  const toUploadFile = (asset: any, fallbackName: string, mime: string) => ({
    uri: asset.uri,
    name: asset.fileName || asset.name || fallbackName,
    type: asset.type || mime,
  });

  const pickFromLibrary = async () => {
    setAttachOpen(false);
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    const asset = result.assets?.[0];
    if (asset?.uri) await sendMedia(toUploadFile(asset, `photo-${Date.now()}.jpg`, 'image/jpeg'), 'photo');
  };

  const takePhoto = async () => {
    setAttachOpen(false);
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        showAlert({
          title: 'Camera permission needed',
          message: 'Allow camera access to take a photo.',
          actions: [{ text: 'OK' }],
        });
        return;
      }
    }
    const result = await launchCamera({ mediaType: 'photo', saveToPhotos: false });
    const asset = result.assets?.[0];
    if (asset?.uri) await sendMedia(toUploadFile(asset, `photo-${Date.now()}.jpg`, 'image/jpeg'), 'photo');
  };

  const pickDocument = async () => {
    setAttachOpen(false);
    try {
      const [doc] = await pick({ type: [types.allFiles], mode: 'import' });
      if (doc?.uri) {
        await sendMedia(
          {
            uri: doc.uri,
            name: doc.name || `file-${Date.now()}`,
            type: doc.type || 'application/octet-stream',
          },
          'file'
        );
      }
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      showAlert({
        title: 'Pick Failed',
        message: 'Could not open the document picker.',
        actions: [{ text: 'OK' }],
      });
    }
  };

  const startVoice = async () => {
    if (!chatId || locked) return;

    // Android requires a runtime mic permission. If it's denied we bail out
    // cleanly — never enter recording mode without permission.
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        showAlert({
          title: 'Microphone permission needed',
          message: 'Allow microphone access to record voice messages.',
          actions: [{ text: 'OK' }],
        });
        return;
      }
    }

    // Switch the composer into recording mode (stop button + timer) BEFORE
    // touching the native recorder, so the UI always reflects the state.
    setRecording(true);
    setRecordingSecs(0);
    recordingRef.current.start = Date.now();
    recordingRef.current.timer = setInterval(() => {
      setRecordingSecs(Math.floor((Date.now() - recordingRef.current.start) / 1000));
    }, 500);

    try {
      await Sound.startRecorder();
    } catch {
      // Native recorder failed to start — revert the recording UI.
      setRecording(false);
      const { timer } = recordingRef.current;
      if (timer) clearInterval(timer);
      recordingRef.current.timer = null;
      setRecordingSecs(0);
      showAlert({
        title: 'Recording Failed',
        message: 'Could not start voice recording.',
        actions: [{ text: 'OK' }],
      });
    }
  };

  // Discard the in-progress voice note without sending it.
  const cancelVoice = async () => {
    if (!recording) return;
    setRecording(false);
    const { timer } = recordingRef.current;
    if (timer) clearInterval(timer);
    recordingRef.current.timer = null;
    setRecordingSecs(0);
    try {
      await Sound.stopRecorder();
    } catch {
      // discard — nothing to do
    }
  };

  // Stop the recorder and send the voice note (WhatsApp-style "send").
  const sendVoice = async () => {
    if (!recording) return;
    setRecording(false);
    const { timer } = recordingRef.current;
    if (timer) clearInterval(timer);
    recordingRef.current.timer = null;
    setRecordingSecs(0);
    try {
      const path = await Sound.stopRecorder();
      if (path) {
        // Exact recorded length so the bubble shows e.g. 0:30.
        const recordedSecs = Math.max(
          1,
          Math.round((Date.now() - recordingRef.current.start) / 1000)
        );
        const name = `voice-${Date.now()}.m4a`;
        await sendMedia(
          { uri: path, name, type: 'audio/m4a' },
          'voice',
          undefined,
          recordedSecs
        );
      }
    } catch {
      showAlert({
        title: 'Recording Failed',
        message: 'Could not save the voice note.',
        actions: [{ text: 'OK' }],
      });
    }
  };

  // Voice notes play inline via the native Sound player; file attachments
  // open in the system browser. Tapping the active note pauses it.
  const onMediaChipPress = async (item: Message) => {
    const uri = mediaFullUrl(item.mediaUrl);
    if (!uri) return;

    if (item.type !== 'voice') {
      Linking.openURL(uri).catch(() => {});
      return;
    }

    const id = String(item.id);

    // Toggle: tapping the currently-playing note pauses it.
    if (playingVoiceId === id) {
      setPlayingVoiceId(null);
      playingVoiceIdRef.current = null;
      setVoicePosition(0);
      try {
        await Sound.pausePlayer();
      } catch {
        // ignore
      }
      return;
    }

    try {
      // Stop any note that's playing before starting a new one.
      if (playingVoiceIdRef.current) await Sound.stopPlayer();
      setVoicePosition(0);
      await Sound.startPlayer(uri);
      playingVoiceIdRef.current = id;
      setPlayingVoiceId(id);
    } catch {
      setPlayingVoiceId(null);
      playingVoiceIdRef.current = null;
      console.warn('[chat] Voice playback failed:', uri);
    }
  };

  const formatVoiceTime = (secs: number): string => {
    const s = Math.max(0, Math.floor(secs));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  // WhatsApp-style duration label. While playing it counts DOWN from the total
  // (0:30 → 0:29 → … → 0:00); otherwise it shows the exact recorded duration.
  const voiceDurationLabel = (item: Message): string => {
    const playing = playingVoiceId === String(item.id);
    if (playing) {
      const total = item.durationSecs ?? voiceDuration;
      return formatVoiceTime(Math.max(0, total - voicePosition));
    }
    const dur = item.durationSecs ?? voiceDurationsRef.current[String(item.id)];
    return dur ? formatVoiceTime(dur) : 'Voice';
  };

  const voiceProgressPct = (item: Message): number => {
    if (playingVoiceId !== String(item.id) || voiceDuration <= 0) return 0;
    return Math.min(100, (voicePosition / voiceDuration) * 100);
  };

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const prev = messages[index - 1];
    const showDate = !prev || !dayjs(item.createdAt).isSame(dayjs(prev.createdAt), 'day');
    const isGroupStart = !prev || prev.sentByMe !== item.sentByMe || showDate;

    // Session boundary — horizontal divider separating the previous session's
    // read-only history (messages above) from the new session (below).
    if (item.type === 'session-start') {
      return (
        <View style={styles.sessionDivider}>
          <View style={styles.sessionDividerLine} />
          <Text style={styles.sessionDividerText}>
            {sessionDividerLabel(item)}
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
          ]}
        >
          {!item.sentByMe && (
            <View style={styles.avatarSlot}>
              {isGroupStart ? <Avatar name={effectiveName || '?'} size={30} /> : null}
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
                <TouchableOpacity
                  onPress={() => setPreviewImage(mediaFullUrl(item.mediaUrl))}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: mediaFullUrl(item.mediaUrl) ?? undefined }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : item.mediaUrl && item.type === 'voice' ? (
                <View style={styles.voiceBubble}>
                  <TouchableOpacity
                    style={[
                      styles.voicePlayPause,
                      item.sentByMe ? styles.voicePlaySent : styles.voicePlayReceived,
                    ]}
                    onPress={() => onMediaChipPress(item)}
                    activeOpacity={0.7}
                  >
                    <AppIcon
                      name={playingVoiceId === String(item.id) ? 'pause' : 'play'}
                      size={18}
                      color={item.sentByMe ? Colors.white : Colors.primary}
                    />
                  </TouchableOpacity>
                  <View style={styles.voiceWave}>
                    <View
                      style={[
                        styles.voiceProgressTrack,
                        item.sentByMe ? styles.voiceTrackSent : styles.voiceTrackReceived,
                      ]}
                    >
                      <View
                        style={[
                          styles.voiceProgressFill,
                          item.sentByMe ? styles.voiceFillSent : styles.voiceFillReceived,
                          { width: `${voiceProgressPct(item)}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.voiceDuration,
                      item.sentByMe ? styles.voiceDurationSent : styles.voiceDurationReceived,
                    ]}
                  >
                    {voiceDurationLabel(item)}
                  </Text>
                </View>
              ) : item.mediaUrl ? (
                <TouchableOpacity
                  style={styles.mediaChip}
                  onPress={() => onMediaChipPress(item)}
                  activeOpacity={0.7}
                >
                  <AppIcon name="document-attach-outline" size={18} color={Colors.text} />
                  <Text style={styles.mediaChipText}>File attachment</Text>
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
          <Avatar name={effectiveName || '?'} size={30} />
        </View>
        <TypingIndicator />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
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
          onStartReached={loadOlder}
          onStartReachedThreshold={0.3}
          maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
          ListHeaderComponent={
            loadingMore ? (
              <ActivityIndicator style={styles.loadMoreIndicator} />
            ) : null
          }
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
            {/* Attach / media picker */}
            <TouchableOpacity
              style={[styles.roundButton, styles.attachButton, locked && styles.buttonDisabled]}
              onPress={() => setAttachOpen((o) => !o)}
              activeOpacity={0.85}
              disabled={locked || recording}
            >
              <AppIcon name="add" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>

            {recording ? (
              <View style={[styles.textInputWrapper, styles.recordingWrapper]}>
                <TouchableOpacity
                  style={styles.recordingStop}
                  onPress={cancelVoice}
                  activeOpacity={0.7}
                >
                  <AppIcon name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
                <Text style={styles.recordingText}>
                  {String(Math.floor(recordingSecs / 60)).padStart(2, '0')}:
                  {String(recordingSecs % 60).padStart(2, '0')}
                </Text>
              </View>
            ) : (
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
                  keyboardAppearance="dark"
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
            )}

            {/* Mic (start voice note) or send (text / voice) */}
            {inputText.trim().length === 0 && !recording ? (
              <TouchableOpacity
                style={[styles.roundButton, styles.sendButton, locked && styles.buttonDisabled]}
                onPress={startVoice}
                activeOpacity={0.85}
                disabled={locked}
              >
                <AppIcon name="mic" size={20} color={Colors.primary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.roundButton,
                  styles.sendButton,
                  locked && styles.buttonDisabled,
                ]}
                onPress={() => (recording ? sendVoice() : sendMessage())}
                activeOpacity={0.85}
                disabled={locked}
              >
                <AppIcon name="arrow-up" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Attach options */}
          {attachOpen && (
            <View style={styles.attachSheet}>
              <TouchableOpacity style={styles.attachItem} onPress={takePhoto} activeOpacity={0.7}>
                <AppIcon name="camera-outline" size={20} color={Colors.primary} />
                <Text style={styles.attachItemText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachItem} onPress={pickFromLibrary} activeOpacity={0.7}>
                <AppIcon name="images-outline" size={20} color={Colors.primary} />
                <Text style={styles.attachItemText}>Photo Library</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachItem} onPress={pickDocument} activeOpacity={0.7}>
                <AppIcon name="document-attach-outline" size={20} color={Colors.primary} />
                <Text style={styles.attachItemText}>File</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachItem} onPress={() => setAttachOpen(false)} activeOpacity={0.7}>
                <AppIcon name="close" size={20} color={Colors.textSecondary} />
                <Text style={styles.attachItemText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <SessionExtensionAlert
        visible={showExtension}
        secondsLeft={extensionSecondsLeft}
        onCancel={handleExtensionCancel}
        onExtend={handleExtend}
      />

      {/* Full-screen image viewer (tap photo to open; back arrow / ✕ / tap to close) */}
      <Modal
        visible={previewImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <TouchableOpacity
          style={styles.imageViewerBackdrop}
          activeOpacity={1}
          onPress={() => setPreviewImage(null)}
        >
          <TouchableOpacity
            style={styles.imageViewerBackButton}
            onPress={() => setPreviewImage(null)}
            activeOpacity={0.7}
          >
            <AppIcon name="chevron-back" size={26} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setPreviewImage(null)}
            activeOpacity={0.7}
          >
            <AppIcon name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
          {previewImage ? (
            <Image
              source={{ uri: previewImage }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          ) : null}
        </TouchableOpacity>
      </Modal>
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
  loadMoreIndicator: {
    paddingVertical: 12,
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
  headerEndButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorSoft,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    marginRight: Spacing.xs,
  },
  headerEndText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.error,
    marginLeft: 4,
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
    backgroundColor: Colors.infoSoft,
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
  // Uniform spacing between every message row — identical gap regardless of
  // message length or sender, so the chat looks clean and even.
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    alignItems: 'flex-end',
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
  voiceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 190,
    paddingVertical: Spacing.xs,
  },
  voicePlayPause: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  voicePlaySent: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  voicePlayReceived: {
    backgroundColor: 'rgba(91,103,241,0.12)',
  },
  voiceWave: {
    flex: 1,
  },
  voiceProgressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  voiceTrackSent: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  voiceTrackReceived: {
    backgroundColor: 'rgba(127,127,127,0.22)',
  },
  voiceProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  voiceFillSent: {
    backgroundColor: Colors.white,
  },
  voiceFillReceived: {
    backgroundColor: Colors.primary,
  },
  voiceDuration: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: Spacing.sm,
    minWidth: 36,
    textAlign: 'right',
  },
  voiceDurationSent: {
    color: 'rgba(255,255,255,0.9)',
  },
  voiceDurationReceived: {
    color: Colors.textSecondary,
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
    backgroundColor: Colors.inputBackground, // #151A33 input area
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
    backgroundColor: Colors.inputBackground, // #151A33 voice/send button
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginLeft: Spacing.sm,
    marginRight: Spacing.md,
  },
  textInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground, // #151A33 input field
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.xs,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    maxHeight: 100,
    paddingVertical: 10,
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
  attachButton: {
    backgroundColor: Colors.inputBackground, // #151A33 "+" button
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginRight: Spacing.sm,
  },
  recordingWrapper: {
    justifyContent: 'center',
  },
  recordingStop: {
    position: 'absolute',
    left: 10,
    top: '50%',
    marginTop: -10,
  },
  recordingText: {
    flex: 1,
    fontSize: 15,
    color: Colors.error,
    textAlign: 'center',
    fontWeight: '600',
  },
  attachSheet: {
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    overflow: 'hidden',
    ...Shadows.raised,
  },
  attachItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  attachItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.md,
  },
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
  imageViewerBackButton: {
    position: 'absolute',
    top: 56,
    left: Spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 56,
    right: Spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatDetailScreen;
