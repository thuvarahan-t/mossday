import { weekdayIndex, type LocalDate } from './date';

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Intensity scales to the daily goal; completion always uses the habit's full colour.
 */
export function heatLevel(count: number, dailyGoal = 1): HeatLevel {
  if (count <= 0) return 0;
  const level = Math.ceil((count / Math.max(1, dailyGoal)) * 4);
  return Math.min(4, level) as HeatLevel;
}

/** `activeDays` bitmask: Monday = 1 … Sunday = 64. */
export function isActiveDay(activeDays: number, date: LocalDate): boolean {
  return (activeDays & (1 << weekdayIndex(date))) !== 0;
}

export const ALL_DAYS_MASK = 127;
