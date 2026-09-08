import { StyleSheet, Platform } from 'react-native';
import { Colors, Radius, Shadows, Spacing, wp, ms, fs, responsiveSize } from '../../theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  loadMoreIndicator: {
    paddingVertical: ms(12),
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
    fontSize: fs(12),
    color: Colors.success,
    fontWeight: '500',
  },
  headerTitleStatusOffline: {
    color: Colors.textTertiary,
  },
  // headerMenuButton: {
  //   width: 36,
  //   height: 36,
  //   borderRadius: Radius.round,
  //   backgroundColor: Colors.primarySoft,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   marginRight: Spacing.xs,
  // },
  headerMenuButtonDisabled: {
    opacity: 0.45,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: Spacing.md,
  },
  menuCard: {
    minWidth: wp(220),
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  menuItemText: {
    fontSize: fs(15),
    fontWeight: '600',
    color: Colors.text,
  },
  menuItemDanger: {
    color: Colors.error,
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
    fontSize: fs(12),
    fontWeight: '600',
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: ms(6),
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
    fontSize: fs(12),
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
    fontSize: fs(13),
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
    fontSize: fs(13),
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
    width: wp(30),
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
    borderBottomRightRadius: ms(6),
  },
  receivedBubble: {
    backgroundColor: Colors.chatBubbleReceived,
    borderBottomLeftRadius: ms(6),
  },
  messageText: {
    fontSize: fs(15),
    lineHeight: fs(21),
  },
  mediaImage: {
    width: wp(200),
    height: wp(170),
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
    fontSize: fs(13),
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  voiceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: wp(190),
    paddingVertical: Spacing.xs,
  },
  voicePlayPause: {
    width: wp(34),
    height: wp(34),
    borderRadius: wp(17),
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
    fontSize: fs(12),
    fontWeight: '600',
    marginLeft: Spacing.sm,
    minWidth: wp(36),
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
    marginTop: ms(2),
  },
  bubbleTime: {
    fontSize: fs(11),
    fontWeight: '400',
  },
  sentTimeText: {
    color: 'rgba(255,255,255,0.8)',
  },
  receivedTimeText: {
    color: Colors.textTertiary,
  },
  checkIcon: {
    marginLeft: ms(3),
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
    paddingVertical: ms(14),
    ...Shadows.card,
  },
  typingDot: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: Colors.primary,
    marginHorizontal: ms(3),
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
    paddingVertical: ms(6),
  },
  systemText: {
    fontSize: fs(12),
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
    fontSize: fs(24),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  roundButton: {
    width: wp(40),
    height: wp(40),
    borderRadius: Radius.round,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginBottom: ms(2),
  },
  sendButton: {
    backgroundColor: Colors.inputBackground, // #151A33 voice/send button
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginLeft: Spacing.sm,
    // Override roundButton's default right margin so the composer stays balanced.
    marginRight: 0,
  },
  textInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground, // #151A33 input field
    borderRadius: ms(22),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.xs,
    minHeight: wp(44),
  },
  textInput: {
    flex: 1,
    fontSize: fs(15),
    color: Colors.text,
    maxHeight: 100,
    paddingVertical: ms(10),
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputAction: {
    width: wp(34),
    height: wp(34),
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
  // Big touch target (full field height, ~46px wide) so cancel works on the
  // first tap — the old 20px absolute icon needed several tries.
  recordingStop: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: wp(46),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  recordingText: {
    flex: 1,
    fontSize: fs(15),
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
    fontSize: fs(15),
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
    width: wp(40),
    height: wp(40),
    borderRadius: wp(20),
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 56,
    right: Spacing.md,
    zIndex: 10,
    width: wp(40),
    height: wp(40),
    borderRadius: wp(20),
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // In-chat call history bubble (WhatsApp-style).
  callBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ms(6),
  },
  callIconWrap: {
    width: wp(32),
    height: wp(32),
    borderRadius: wp(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  callIconWrapReceived: {
    backgroundColor: 'rgba(124,134,255,0.14)',
  },
  callInfo: {
    flexShrink: 1,
  },
  callTitle: {
    fontSize: fs(14),
    fontWeight: '600',
  },
  callMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(2),
  },
  callMeta: {
    fontSize: fs(12),
    marginLeft: ms(3),
  },
  callTextSent: {
    color: Colors.white,
  },
  callTextReceived: {
    color: Colors.text,
  },
  callMetaSent: {
    color: 'rgba(255,255,255,0.85)',
  },
  callMetaReceived: {
    color: Colors.textSecondary,
  },
});
