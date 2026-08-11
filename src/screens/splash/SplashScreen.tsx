import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
  const connectOffset = useSharedValue(-width / 2);
  const appOffset = useSharedValue(width / 2);
  const bubbleScale = useSharedValue(0);
  const bubbleOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    // Start animations
    connectOffset.value = withSpring(0, { damping: 12, stiffness: 100 });
    appOffset.value = withSpring(0, { damping: 12, stiffness: 100 });
    bubbleScale.value = withDelay(400, withSpring(1, { damping: 10, stiffness: 120 }));
    bubbleOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
    textOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    taglineOpacity.value = withDelay(900, withTiming(1, { duration: 500 }));
    // Shared values are stable refs — safe to include and never re-triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: connectOffset.value }],
  }));

  const appStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: appOffset.value }],
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
    opacity: bubbleOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Soft ambient glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.logoContainer}>
        {/* Chat Bubble Icon */}
        <Animated.View style={[styles.bubbleContainer, bubbleStyle]}>
          <View style={styles.chatBubble}>
            <View style={styles.bubbleDot} />
            <View style={[styles.bubbleDot, styles.bubbleDotSmall]} />
          </View>
        </Animated.View>

        {/* Title */}
        <View style={styles.titleRow}>
          <Animated.Text style={[styles.title, styles.titleConnect, connectStyle]}>
            Connect
          </Animated.Text>
          <Animated.Text style={[styles.title, styles.titleApp, appStyle]}>
            App
          </Animated.Text>
        </View>

        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Your Health, Connected
        </Animated.Text>
      </View>

      <Animated.Text style={[styles.footer, textStyle]}>
        Healthcare Communication
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.splashBackground,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: Colors.splashGlow,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.splashGlow,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: -60,
  },
  bubbleContainer: {
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBubble: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: Colors.splashIcon,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.splashIcon,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  bubbleDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.white,
    marginBottom: 4,
  },
  bubbleDotSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignSelf: 'flex-end',
    marginRight: 12,
    marginTop: -2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  title: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },
  titleConnect: {
    color: Colors.splashText,
  },
  titleApp: {
    color: Colors.splashIconSoft,
    marginLeft: 6,
  },
  tagline: {
    fontSize: 16,
    color: Colors.splashTextSecondary,
    marginTop: 12,
    fontWeight: '400',
    letterSpacing: 0.4,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    fontSize: 13,
    color: Colors.splashTextTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

export default SplashScreen;
