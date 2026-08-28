import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Image, Animated, Easing, Platform, BackHandler, TouchableOpacity } from 'react-native';
import { Phone, Video, X, Check } from 'lucide-react-native';
import { useCall } from '../../context/CallContext';
import { Colors, Spacing } from '../../theme';

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
  const [scale] = React.useState(new Animated.Value(0.9));
  const [ringOpacity] = React.useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(ringOpacity, {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity, {
              toValue: 0,
              duration: 1000,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          { iterations: -1 }
        ),
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
    }
  }, [visible]);

  if (!visible) return null;

  const callTypeIcon = state.callType === 'video' ? <Video size={28} color={Colors.white} /> : <Phone size={28} color={Colors.white} />;
  const callTypeText = state.callType === 'video' ? 'Video Call' : 'Audio Call';

  return (
    <Animated.View
      style={[
        styles.overlay,
        { opacity },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Animated.View
        style={[
          styles.modal,
          { transform: [{ scale }] },
        ]}
      >
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

        {/* Action buttons */}
        <View style={styles.buttonsContainer}>
          <Animated.View
            style={[
              styles.actionButton,
              { opacity: ringOpacity },
            ]}
          >
            <TouchableOpacity
              style={styles.rejectButtonInner}
              onPress={onReject}
              activeOpacity={0.8}
            >
              <X size={28} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.buttonLabel}>Decline</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.actionButton,
              { opacity: ringOpacity },
            ]}
          >
            <TouchableOpacity
              style={styles.acceptButtonInner}
              onPress={onAccept}
              activeOpacity={0.8}
            >
              <Check size={28} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.buttonLabel}>Accept</Text>
          </Animated.View>
        </View>

        {/* Swipe hint */}
        <View style={styles.swipeHint}>
          <Text style={styles.swipeText}>Slide to answer</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  callTypeBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    fontSize: 18,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
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
    fontSize: 56,
    fontWeight: '600',
    color: Colors.white,
  },
  callerName: {
    fontSize: 28,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  incomingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxl,
  },
  actionButton: {
    alignItems: 'center',
  },
  rejectButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonLabel: {
    marginTop: Spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  swipeHint: {
    marginTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  swipeText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});