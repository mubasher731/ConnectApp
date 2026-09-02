/**
 * Responsive scaling utilities for ConnectApp.
 *
 * The UI is authored on a 375×812 design canvas (≈ iPhone 13 / most Androids).
 * These helpers scale every fixed pixel from that baseline so the app renders
 * correctly on small phones (iPhone SE), medium/large phones, and tablets, in
 * both portrait and landscape.
 *
 * The installed `react-native-size-matters` package uses a hard-coded 350×680
 * guideline with no clamping, which blows up layouts on wide tablets, so we
 * keep our own clamped, orientation-aware implementation here and re-export
 * the package's helpers (`ScaledSheet`, `sizeMattersScale`, …) for anything
 * that wants the raw library behaviour.
 */
import { Dimensions, PixelRatio } from 'react-native';

// ScaledSheet + raw library helpers stay available for advanced use.
export {
  ScaledSheet,
  scale as sizeMattersScale,
  verticalScale as sizeMattersVerticalScale,
  moderateScale as sizeMattersModerateScale,
  moderateVerticalScale as sizeMattersModerateVerticalScale,
} from 'react-native-size-matters';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');

// Orientation-aware dimensions: use the SHORT dimension for width-based
// scaling and the LONG dimension for height-based scaling. This keeps element
// sizes stable when the device is rotated (phone width/height swap).
const [shortDimension, longDimension] =
  WINDOW_WIDTH < WINDOW_HEIGHT
    ? [WINDOW_WIDTH, WINDOW_HEIGHT]
    : [WINDOW_HEIGHT, WINDOW_WIDTH];

/** Design-time canvas the screens were built against. */
export const BASE_WIDTH = 375;
export const BASE_HEIGHT = 812;

/** Clamp bounds — shrink small phones, grow large ones, cap tablets. */
export const MIN_SCALE = 0.8;
export const MAX_SCALE = 1.18;

const clampScale = (value: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

/** Horizontal (width-based) scale factor. */
export const designScale = clampScale(shortDimension / BASE_WIDTH);
/** Vertical (height-based) scale factor. */
export const verticalDesignScale = clampScale(longDimension / BASE_HEIGHT);

const round = (value: number): number => PixelRatio.roundToNearestPixel(value);

/**
 * Width-based scaling — for element widths, horizontal offsets, icon sizes,
 * avatar sizes, etc. Designed at width 375.
 */
export const wp = (size: number): number => round(size * designScale);

/**
 * Height-based scaling — for element heights, vertical gaps and large hero
 * blocks that should track the physical screen height.
 */
export const hp = (size: number): number => round(size * verticalDesignScale);

/**
 * Moderate scaling (default factor 0.5) — for padding, margins and border
 * radius. Interpolates between the raw value and the fully-scaled value so
 * spacing never feels cramped on small screens or oversized on big ones.
 */
export const ms = (size: number, factor = 0.5): number =>
  round(size + (size * designScale - size) * factor);

/** Moderate VERTICAL scaling — for vertical padding that follows height. */
export const mvs = (size: number, factor = 0.5): number =>
  round(size + (size * verticalDesignScale - size) * factor);

/**
 * Font-size scaling (gentle 0.3 factor) — text scales less aggressively than
 * layout so it stays legible and never overflows bubbles/cards.
 */
export const fs = (size: number): number =>
  round(size + (size * designScale - size) * 0.3);
