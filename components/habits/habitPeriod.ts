import { dateRange, daysBetween, endOfMonth, monthName, parseLocalDate, startOfMonth, startOfWeek, todayLocalDate } from '@/lib/date';
import { isActiveDay } from '@/lib/heatmap';
import type { Habit } from '@/lib/repos/habits';

export type HabitTrackerMode = 'Month' | 'Year';

export function habitPeriod(mode: HabitTrackerMode, anchor: string) {
  const year = anchor.slice(0, 4);
  const start = mode === 'Month' ? startOfMonth(anchor) : `${year}-01-01`;
  const end = mode === 'Month' ? endOfMonth(anchor) : `${year}-12-31`;
  const gridStart = startOfWeek(start);
  return { start, end, gridStart, weeks: Math.ceil((daysBetween(gridStart, end) + 1) / 7), label: mode === 'Month' ? `${monthName(anchor)} ${year}` : year };
}

/** Goal-met days so far in the anchor's month, out of the active days that have started. */
export function monthProgress(habit: Pick<Habit, 'dailyGoal' | 'activeDays'>, counts: Readonly<Record<string, number>>, anchor: string, today: string) {
  const { start, end } = habitPeriod('Month', anchor);
  const last = end < today ? end : today;
  const days = start <= last ? dateRange(start, last).filter((day) => isActiveDay(habit.activeDays, day)) : [];
  return { done: days.filter((day) => (counts[day] ?? 0) >= habit.dailyGoal).length, eligible: days.length };
}

/** URL dates may be malformed or in the future; never use them directly in the editor. */
export function safeHabitDate(value: unknown, today: string): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1970-01-01' && value <= today && todayLocalDate(parseLocalDate(value)) === value ? value : today;
}
