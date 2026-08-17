import { Colors } from './colors';
import { PixelRatio } from 'react-native';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

/**
 * The design was authored around a 375px-wide phone. Keep that design intact
 * while scaling it down for compact phones and up for wider handsets.
 */
const widthScale = Math.min(1.18, Math.max(0.8, wp('100%') / 375));

export const responsiveSize = (size: number, scale = widthScale): number =>
  PixelRatio.roundToNearestPixel(size * scale);

/** Spacing scale (8-pt grid) */
export const Spacing = {
  xs: responsiveSize(4),
  sm: responsiveSize(8),
  md: responsiveSize(12),
  lg: responsiveSize(16),
  xl: responsiveSize(24),
  xxl: responsiveSize(32),
  screen: responsiveSize(24),
} as const;

/** Border radius scale */
export const Radius = {
  sm: responsiveSize(10),
  md: responsiveSize(16),
  lg: responsiveSize(20),
  xl: responsiveSize(28),
  round: 999,
} as const;

/** Reusable shadow presets (iOS + Android) */
export const Shadows = {
  none: {},
  card: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  } as const,
  raised: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  } as const,
  primary: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  } as const,
} as const;

export { Colors };
