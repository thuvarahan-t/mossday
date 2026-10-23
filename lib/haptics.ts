import * as Haptics from 'expo-haptics';

/**
 * The app's single haptics map. Failures are ignored: haptics are feedback, never logic,
 * and some devices or emulators have no vibrator.
 */
export const haptics = {
  /** Picking a segment, tab, date or chip. */
  selection: () => Haptics.selectionAsync().catch(() => undefined),
  /** Ordinary taps: keypad keys, checkbox, steppers. */
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  /** Habit tick and other "made progress" moments. */
  tick: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  /** Deletes and cancelled recordings. */
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
};
