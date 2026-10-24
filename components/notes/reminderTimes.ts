import { formatClock, formatWeekdayShortDate, relativeDayName, todayLocalDate } from '@/lib/date';

/** "Later today" comes at the first of these hours that is still an hour away. */
const LATER_TODAY_HOURS = [9, 13, 18, 20];
const MORNING = 8;
const HOUR_MS = 3_600_000;

/** Keep's quick picks: later today (while there is time left), tomorrow morning, next Monday morning. */
export function reminderPresets(now: Date): { label: string; at: Date }[] {
  const at = (days: number, hour: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return date;
  };
  const later = LATER_TODAY_HOURS.map((hour) => at(0, hour)).find((date) => date.getTime() - now.getTime() >= HOUR_MS);
  // getDay(): Sunday 0 … Saturday 6. A Monday's next week is seven days on.
  const toMonday = (8 - now.getDay()) % 7 || 7;
  return [
    ...later ? [{ label: 'Later today', at: later }] : [],
    { label: 'Tomorrow', at: at(1, MORNING) },
    { label: 'Next week', at: at(toMonday, MORNING) },
  ];
}

/** "Today, 18:00", "Tomorrow, 8:00" or "Mon, 26 Oct, 8:00". */
export function formatReminder(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const day = todayLocalDate(date);
  return `${relativeDayName(day, todayLocalDate(now)) ?? formatWeekdayShortDate(day)}, ${formatClock(date)}`;
}
