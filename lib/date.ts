/**
 * Local calendar dates as `yyyy-MM-dd` strings (spec §7: never derive a day from UTC).
 * Display names are spelled out here so every device shows the design's exact wording.
 */
export type LocalDate = string;

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A calendar date in the device's timezone, never derived from UTC. */
export function todayLocalDate(date: Date = new Date()): LocalDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local midnight of a `yyyy-MM-dd` date. */
export function parseLocalDate(value: LocalDate): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(value: LocalDate, days: number): LocalDate {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return todayLocalDate(date);
}

export function addMonths(value: LocalDate, months: number): LocalDate {
  const date = parseLocalDate(value);
  return todayLocalDate(new Date(date.getFullYear(), date.getMonth() + months, 1));
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return Math.round((parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / 86_400_000);
}

/** Monday = 0 … Sunday = 6 (the app's weeks start on Monday). */
export function weekdayIndex(value: LocalDate): number {
  return (parseLocalDate(value).getDay() + 6) % 7;
}

export function startOfWeek(value: LocalDate): LocalDate {
  return addDays(value, -weekdayIndex(value));
}

export function startOfMonth(value: LocalDate): LocalDate {
  return `${value.slice(0, 7)}-01`;
}

export function daysInMonth(value: LocalDate): number {
  const date = parseLocalDate(value);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function endOfMonth(value: LocalDate): LocalDate {
  return `${value.slice(0, 7)}-${String(daysInMonth(value)).padStart(2, '0')}`;
}

export function dayOfMonth(value: LocalDate): number {
  return Number(value.slice(8, 10));
}

export const weekdayName = (value: LocalDate) => WEEKDAYS[weekdayIndex(value)];
export const weekdayShort = (value: LocalDate) => weekdayName(value).slice(0, 3);
export const monthName = (value: LocalDate) => MONTHS[parseLocalDate(value).getMonth()];
export const monthShort = (value: LocalDate) => monthName(value).slice(0, 3);
/** Single-letter weekday headers, Monday first. */
export const WEEKDAY_LETTERS = WEEKDAYS.map((name) => name[0]);

/** "Thursday, 22 October" */
export function formatLongDate(value: LocalDate): string {
  return `${weekdayName(value)}, ${dayOfMonth(value)} ${monthName(value)}`;
}

/** "22 Oct" */
export function formatShortDate(value: LocalDate): string {
  return `${dayOfMonth(value)} ${monthShort(value)}`;
}

/** "Wed, 14 Oct" */
export function formatWeekdayShortDate(value: LocalDate): string {
  return `${weekdayShort(value)}, ${formatShortDate(value)}`;
}

/** "Today" / "Yesterday" / "Tomorrow" or null. */
export function relativeDayName(value: LocalDate, today: LocalDate = todayLocalDate()): string | null {
  const offset = daysBetween(today, value);
  if (offset === 0) return 'Today';
  if (offset === -1) return 'Yesterday';
  if (offset === 1) return 'Tomorrow';
  return null;
}

/** "Today, 22 Oct" or "Mon, 19 Oct" */
export function formatDayHeading(value: LocalDate, today: LocalDate = todayLocalDate()): string {
  const relative = relativeDayName(value, today);
  return relative ? `${relative}, ${formatShortDate(value)}` : formatWeekdayShortDate(value);
}

/** "22 October 2026 at 19:36" */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} at ${formatClock(date)}`;
}

/** "7:40" / "19:36" — 24-hour clock without a leading zero on the hour, as in the design. */
export function formatClock(date: Date): string {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Relative label for list rows: "19:36" today, "Yesterday", weekday this week, else "22 Oct". */
export function formatRelativeTimestamp(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const day = todayLocalDate(date);
  const today = todayLocalDate(now);
  const offset = daysBetween(day, today);
  if (offset === 0) return formatClock(date);
  if (offset === 1) return 'Yesterday';
  if (offset > 1 && offset < 7) return weekdayName(day);
  return formatShortDate(day);
}

/** Inclusive list of dates from `from` to `to`. */
export function dateRange(from: LocalDate, to: LocalDate): LocalDate[] {
  const days: LocalDate[] = [];
  for (let current = from; current <= to; current = addDays(current, 1)) days.push(current);
  return days;
}

/** "0:42" / "12:05" for voice notes and the recording timer. */
export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
}
