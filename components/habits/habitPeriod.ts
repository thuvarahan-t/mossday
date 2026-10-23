import { daysBetween, parseLocalDate, startOfWeek, todayLocalDate } from '@/lib/date';

/** The anchor's calendar year, with the Monday-aligned grid that covers it. */
export function habitYear(anchor: string) {
  const year = anchor.slice(0, 4);
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const gridStart = startOfWeek(start);
  return { start, end, gridStart, weeks: Math.ceil((daysBetween(gridStart, end) + 1) / 7), label: year };
}

/** URL dates may be malformed or in the future; never use them directly in the editor. */
export function safeHabitDate(value: unknown, today: string): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1970-01-01' && value <= today && todayLocalDate(parseLocalDate(value)) === value ? value : today;
}
