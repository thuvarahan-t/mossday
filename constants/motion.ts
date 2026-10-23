import { Easing, type WithSpringConfig } from 'react-native-reanimated';

/**
 * The only motion values used in the app. Springs run on the UI thread via Reanimated.
 * The cover's "response 0.4 / damping 0.8" iOS spring ≈ stiffness 247 / damping 25,
 * which is what `default` approximates (docs/UI-ANALYSIS.md R17).
 */
export const spring = {
  /** General UI: layout shifts, indicators, page slides. */
  default: { damping: 20, stiffness: 220, mass: 1 },
  /** Buttons, chips, toggles, press feedback. */
  snappy: { damping: 18, stiffness: 320, mass: 1 },
  /** Sheets and large transitions. */
  gentle: { damping: 26, stiffness: 160, mass: 1 },
  /** Success moments: habit tick, tab icon bounce. */
  bouncy: { damping: 12, stiffness: 260, mass: 1 },
} as const satisfies Record<string, WithSpringConfig>;

export const durations = { fast: 150, normal: 250, slow: 400 } as const;

export const easing = {
  standard: Easing.bezier(0.25, 0.1, 0.25, 1),
  /** iOS sheet curve, used when a sheet animates without a gesture velocity. */
  sheet: Easing.bezier(0.32, 0.72, 0, 1),
} as const;

export const scales = {
  pressed: 0.96,
  pop: 1.15,
  tabIconBounce: 1.12,
  /** Screen behind a presented sheet. */
  sheetBackdrop: 0.94,
  contextMenuLift: 1.03,
} as const;

/** Swipe / drag thresholds shared by sheets and swipeable rows. */
export const gestures = {
  dismissVelocity: 900,
  dismissFraction: 0.35,
  /** Past the open distance, rows move this fraction of the finger (iOS Mail feel). */
  rubberBand: 0.35,
  swipeActionWidth: 88,
  fullSwipeFraction: 0.6,
  edgeSwipeWidth: 24,
} as const;

export const toastDuration = 4000;
