import { StyleSheet } from 'react-native';
import { Colors, wp, ms, fs } from '../../theme';

export const styles = StyleSheet.create({
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
    marginBottom: ms(28),
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
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    backgroundColor: Colors.white,
    marginBottom: ms(4),
  },
  bubbleDotSmall: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    alignSelf: 'flex-end',
    marginRight: ms(12),
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
    marginLeft: ms(6),
  },
  tagline: {
    fontSize: fs(16),
    color: Colors.splashTextSecondary,
    marginTop: ms(12),
    fontWeight: '400',
    letterSpacing: 0.4,
  },
  footer: {
    position: 'absolute',
    fontSize: fs(13),
    color: Colors.splashTextTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
