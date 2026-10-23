import { addDays, dateRange, daysBetween, endOfMonth, monthName, parseLocalDate, startOfMonth, startOfWeek, todayLocalDate } from '@/lib/date';

export type HabitTrackerMode = 'Month' | 'Year';

export function habitPeriod(mode: HabitTrackerMode, anchor: string) {
  const year = anchor.slice(0, 4);
  const start = mode === 'Month' ? startOfMonth(anchor) : `${year}-01-01`;
  const end = mode === 'Month' ? endOfMonth(anchor) : `${year}-12-31`;
  const gridStart = startOfWeek(start);
  return { start, end, gridStart, weeks: Math.ceil((daysBetween(gridStart, end) + 1) / 7), label: mode === 'Month' ? `${monthName(anchor)} ${year}` : year };
}

export function habitMonthRows(anchor: string): (string | null)[][] {
  const { start, end, gridStart, weeks } = habitPeriod('Month', anchor);
  const cells = dateRange(gridStart, addDays(gridStart, weeks * 7 - 1)).map((day) => day < start || day > end ? null : day);
  return Array.from({ length: weeks }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}

/** URL dates may be malformed or in the future; never use them directly in the editor. */
export function safeHabitDate(value: unknown, today: string): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1970-01-01' && value <= today && todayLocalDate(parseLocalDate(value)) === value ? value : today;
}
