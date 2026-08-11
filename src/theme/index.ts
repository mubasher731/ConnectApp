import { Colors } from './colors';

/** Spacing scale (8-pt grid) */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  screen: 24,
} as const;

/** Border radius scale */
export const Radius = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
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
