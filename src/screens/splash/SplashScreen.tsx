import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../theme/colors';

const SplashScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const glowSize = Math.min(Math.max(width * 0.78, wp('70%')), hp('42%'));
  const bubbleSize = Math.min(84, Math.max(64, wp('20%')));
  const titleSize = Math.min(44, Math.max(32, wp('10.5%')));
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      {/* Soft ambient glow */}
      <View
        style={[
          styles.glowTop,
          { width: glowSize, height: glowSize, borderRadius: glowSize / 2, top: -glowSize * 0.38, right: -glowSize * 0.38 },
        ]}
      />
      <View
        style={[
          styles.glowBottom,
          { width: glowSize, height: glowSize, borderRadius: glowSize / 2, bottom: -glowSize * 0.34, left: -glowSize * 0.34 },
        ]}
      />

      <View style={[styles.logoContainer, { marginTop: -Math.min(hp('8%'), 60) }]}>
        {/* Chat Bubble Icon */}
        <Animated.View style={[styles.bubbleContainer, bubbleStyle]}>
          <View style={[styles.chatBubble, { width: bubbleSize, height: bubbleSize, borderRadius: bubbleSize / 3 }]}>
            <View style={styles.bubbleDot} />
            <View style={[styles.bubbleDot, styles.bubbleDotSmall]} />
          </View>
        </Animated.View>

        {/* Title */}
        <View style={styles.titleRow}>
          <Animated.Text style={[styles.title, styles.titleConnect, { fontSize: titleSize }, connectStyle]}>
            Connect
          </Animated.Text>
          <Animated.Text style={[styles.title, styles.titleApp, { fontSize: titleSize }, appStyle]}>
            App
          </Animated.Text>
        </View>

        <Animated.Text style={[styles.tagline, taglineStyle]}>
          Your Health, Connected
        </Animated.Text>
      </View>

      <Animated.Text style={[styles.footer, { bottom: Math.max(insets.bottom + 16, hp('4%')) }, textStyle]}>
        Healthcare Communication
      </Animated.Text>
    </SafeAreaView>
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
    backgroundColor: Colors.splashGlow,
  },
  glowBottom: {
    position: 'absolute',
    backgroundColor: Colors.splashGlow,
  },
  logoContainer: {
    alignItems: 'center',
  },
  bubbleContainer: {
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBubble: {
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
    fontSize: 13,
    color: Colors.splashTextTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

export default SplashScreen;
