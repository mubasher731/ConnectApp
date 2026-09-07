/**
 * Responsive scaling utilities for ConnectApp.
 *
 * The UI is authored on a 390×844 design canvas (≈ iPhone 14 / most modern
 * Androids). These helpers scale every fixed pixel proportionally from that
 * baseline:
 *
 *     widthFactor  = clamp(screenShortDim / 390)
 *     heightFactor = clamp(screenLongDim  / 844)
 *
 * so the layout grows/shrinks smoothly on small phones (iPhone SE, 360dp
 * Androids), large phones (Pro Max, ~430dp) and tablets — portrait & landscape.
 *
 * WHY this beats react-native-size-matters raw: size-matters uses a fixed
 * 350×680 guideline with NO clamp, so on wide screens (e.g. a 700dp device)
 * everything becomes ~2× and the UI looks distorted. We clamp the factor
 * (see MIN_SCALE/MAX_SCALE) so small screens shrink gracefully and tablets
 * never blow up.
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

/** Physical screen size (px) of the running device. */
export const deviceWidth = WINDOW_WIDTH;
export const deviceHeight = WINDOW_HEIGHT;
/** True on large screens (≥600dp) — use this for tablet-specific layouts. */
export const isTablet = shortDimension >= 600;

/** Design-time canvas the screens were built against (the suggested standard). */
export const BASE_WIDTH = 390;
export const BASE_HEIGHT = 844;

/**
 * Clamp bounds — shrink small phones, grow large ones, cap tablets so the UI
 * is never distorted. Tweak these to taste: raise MAX_SCALE to use more room
 * on tablets, lower MIN_SCALE if small phones still overflow.
 */
export const MIN_SCALE = 0.8;
export const MAX_SCALE = 1.18;

const clampScale = (value: number): number =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

/** Horizontal (width-based) scale factor = screenWidth / 390 (clamped). */
export const designScale = clampScale(shortDimension / BASE_WIDTH);
/** Vertical (height-based) scale factor = screenHeight / 844 (clamped). */
export const verticalDesignScale = clampScale(longDimension / BASE_HEIGHT);

const round = (value: number): number => PixelRatio.roundToNearestPixel(value);

/**
 * Width-based scaling — for element widths, horizontal offsets, icon sizes,
 * avatar sizes, etc. Designed at width 390.
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
