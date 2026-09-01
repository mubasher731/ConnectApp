import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Image, Animated, Easing, Platform, BackHandler, TouchableOpacity } from 'react-native';
import { Phone, Video } from 'lucide-react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useCall } from '../../context/CallContext';
import { Colors, Spacing, responsiveSize } from '../../theme';

interface IncomingCallModalProps {
  visible: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  visible,
  onAccept,
  onReject,
}) => {
  const { state } = useCall();
  const [opacity] = React.useState(new Animated.Value(0));
  const [translateY] = React.useState(new Animated.Value(80));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Bottom controls slide up from below the screen (WhatsApp-style).
        Animated.timing(translateY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // Prevent back button from dismissing
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => backHandler.remove();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
      translateY.setValue(80);
    }
  }, [visible]);

  if (!visible) return null;

  const callTypeIcon = state.callType === 'video' ? <Video size={26} color={Colors.white} /> : <Phone size={26} color={Colors.white} />;
  const callTypeText = state.callType === 'video' ? 'Video Call' : 'Audio Call';

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Upper area: call type, avatar and caller name */}
      <View style={styles.content}>
        {/* Call type indicator */}
        <View style={styles.callTypeBadge}>
          {callTypeIcon}
        </View>
        <Text style={styles.callTypeText}>{callTypeText}</Text>

        {/* Caller avatar */}
        <View style={styles.avatarContainer}>
          {state.remoteUser?.avatar ? (
            <Image
              source={{ uri: state.remoteUser.avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {state.remoteUser?.name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>

        {/* Caller name */}
        <Text style={styles.callerName}>{state.remoteUser?.name || 'Incoming Call'}</Text>
        <Text style={styles.incomingText}>Incoming call...</Text>
      </View>

      {/* Bottom controls — slide up from the bottom (WhatsApp-style) */}
      <Animated.View
        style={[
          styles.bottomSection,
          { transform: [{ translateY }] },
        ]}
      >
        <View style={styles.buttonsContainer}>
          <View style={styles.actionButton}>
            <TouchableOpacity
              style={styles.rejectButtonInner}
              onPress={onReject}
              activeOpacity={0.8}
            >
              <MaterialIcon name="call-end" size={responsiveSize(30)} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.buttonLabel}>Decline</Text>
          </View>

          <View style={styles.actionButton}>
            <TouchableOpacity
              style={[styles.acceptButtonInner, !state.peerReady && styles.acceptButtonDisabled]}
              onPress={onAccept}
              disabled={!state.peerReady}
              activeOpacity={0.8}
            >
              <Phone size={responsiveSize(30)} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.buttonLabel}>
              {state.peerReady ? 'Accept' : 'Preparing…'}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 1000,
  },
  // Upper content is centered; bottom controls are pinned to the bottom.
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  callTypeBadge: {
    width: responsiveSize(64),
    height: responsiveSize(64),
    borderRadius: responsiveSize(32),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  callTypeText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: responsiveSize(132),
    height: responsiveSize(132),
    borderRadius: responsiveSize(66),
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: responsiveSize(52),
    fontWeight: '600',
    color: Colors.white,
  },
  callerName: {
    fontSize: responsiveSize(28),
    fontWeight: '600',
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  incomingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  // WhatsApp-style bottom action area (slides up on show).
  bottomSection: {
    alignItems: 'center',
    paddingTop: responsiveSize(24),
    paddingBottom: responsiveSize(44),
    paddingHorizontal: Spacing.xl,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: responsiveSize(52),
  },
  actionButton: {
    alignItems: 'center',
  },
  rejectButtonInner: {
    width: responsiveSize(76),
    height: responsiveSize(76),
    borderRadius: responsiveSize(38),
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptButtonInner: {
    width: responsiveSize(76),
    height: responsiveSize(76),
    borderRadius: responsiveSize(38),
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptButtonDisabled: {
    opacity: 0.4,
  },
  buttonLabel: {
    marginTop: Spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
});