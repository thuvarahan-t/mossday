import { weekdayIndex, type LocalDate } from './date';

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Spec §5.3: one tick = one level, capped at 4; with a daily goal above 1 the levels scale
 * to the goal so reaching it is always the darkest green.
 */
export function heatLevel(count: number, dailyGoal = 1): HeatLevel {
  if (count <= 0) return 0;
  const level = dailyGoal > 1 ? Math.ceil((count / dailyGoal) * 4) : count;
  return Math.min(4, level) as HeatLevel;
}

/** `activeDays` bitmask: Monday = 1 … Sunday = 64. */
export function isActiveDay(activeDays: number, date: LocalDate): boolean {
  return (activeDays & (1 << weekdayIndex(date))) !== 0;
}

export const ALL_DAYS_MASK = 127;
