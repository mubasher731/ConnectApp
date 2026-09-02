import { Colors } from './colors';
import { PixelRatio } from 'react-native';
import { designScale } from '../utils/responsive';

/**
 * Responsive theme tokens.
 *
 * `Spacing`, `Radius` and `responsiveSize` scale from a 375px-wide design
 * canvas (see `src/utils/responsive.ts`). Every token/value is already
 * proportional to the screen width, so components that use them are responsive
 * for free.
 *
 * Also re-exports the full responsive API (`wp`, `hp`, `ms`, `fs`, …) so
 * screens/components can reach them via `import { ... } from '../../theme'`.
 */
export * from '../utils/responsive';
export { Colors } from './colors';

/**
 * Full width scale of a raw design pixel (kept for backwards compatibility —
 * prefer `wp`/`ms` from the responsive util).
 */
export const responsiveSize = (size: number, scale = designScale): number =>
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
