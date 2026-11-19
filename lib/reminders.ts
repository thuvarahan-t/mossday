import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { listHabits } from './repos/habits';
import { listNoteReminders } from './repos/notes';
import { addDays, parseLocalDate, todayLocalDate } from './date';
import { formatMoney } from './money';
import { listDailyExpenses } from './repos/expenses';
import { getSettings, setSetting } from './repos/settings';
import { read, write } from './repos/store';

export type MealReminder = { name: string; time: string; enabled: boolean };
const DEFAULTS: MealReminder[] = [
  { name: 'Breakfast', time: '09:00', enabled: false }, { name: 'Lunch', time: '14:00', enabled: false }, { name: 'Dinner', time: '21:00', enabled: false },
];
const CHANNEL = 'mossday-reminders';
const PREFIX = 'mossday:';

export async function getMealReminders() {
  const rows = await read((db) => db.getAllAsync<{ key: string; value: string }>("SELECT * FROM settings WHERE key LIKE 'meal:%'"));
  return DEFAULTS.map((fallback) => {
    try {
      const saved = JSON.parse(rows.find((row) => row.key === `meal:${fallback.name}`)?.value ?? 'null');
      return saved && typeof saved.time === 'string' && typeof saved.enabled === 'boolean' ? { ...fallback, time: saved.time, enabled: saved.enabled } : fallback;
    } catch { return fallback; }
  });
}
export async function ensureReminderPermission() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Mossday reminders', importance: AndroidImportance.DEFAULT });
    } catch {
      // Notification channels might not be supported in some environments
    }
  }
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Allow notifications in Settings to enable reminders.');
}
export function validateTime(time: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Enter a time such as 09:00 or 14:30.');
}
export async function saveMealReminder(reminder: MealReminder) {
  validateTime(reminder.time);
  if (reminder.enabled) await ensureReminderPermission();
  await write(async (db) => { await db.runAsync('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', `meal:${reminder.name}`, JSON.stringify(reminder)); }, 'reminders');
}

export async function saveSpendingRecap(enabled: boolean) {
  if (enabled) await ensureReminderPermission();
  await setSetting('spendingRecap', enabled ? 1 : 0);
}

type Wanted = { title?: string; body: string; trigger: Notifications.SchedulableNotificationTriggerInput; url?: string };
const repeating = (time: string, weekday?: number): Notifications.SchedulableNotificationTriggerInput => {
  validateTime(time);
  const [hour, minute] = time.split(':').map(Number);
  return weekday ? { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute, channelId: CHANNEL }
    : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL };
};

async function addSpendingRecaps(wanted: Map<string, Wanted>, now: Date) {
  const { spendingRecap, dailyBudget, currency } = await getSettings();
  if (!spendingRecap) return;
  const today = todayLocalDate(now);
  const morning = parseLocalDate(today);
  morning.setHours(8);
  const first = now < morning ? today : addDays(today, 1);
  const last = addDays(first, 6);
  const expenses = await listDailyExpenses(addDays(first, -1), addDays(last, -1));
  const totals = new Map<string, number>();
  for (const expense of expenses) totals.set(expense.date, (totals.get(expense.date) ?? 0) + expense.amount);
  const money = (amount: number) => formatMoney(amount, currency);

  for (let day = first; day <= last; day = addDays(day, 1)) {
    const spent = totals.get(addDays(day, -1));
    let title = 'Good morning \u2600\uFE0F';
    let body = 'No daily expenses were logged yesterday.';
    if (spent !== undefined) {
      const difference = dailyBudget - spent;
      body = `You spent ${money(spent)} yesterday.`;
      if (dailyBudget > 0 && difference > 0) {
        title = 'Nice work! \u{1F389}';
        body = `You spent ${money(difference)} less than your daily budget yesterday.`;
      } else if (dailyBudget > 0 && difference < 0) {
        title = 'A fresh start today \u{1F331}';
        body = `You went ${money(-difference)} over your daily budget yesterday. Today is a clean slate.`;
      } else if (dailyBudget > 0) {
        title = 'Right on budget \u{1F44F}';
      }
    }
    const date = parseLocalDate(day);
    date.setHours(8);
    // Changes to the amount or delivery time replace the previous schedule.
    wanted.set(`${PREFIX}recap:${date.getTime()}:${title}:${body}`, {
      title, body, url: '/expenses', trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
    });
  }
}

/** Reconcile OS schedules from saved preferences; never ask for permissions at startup. */
export async function syncReminders() {
  const [meals, habits, notes, scheduled] = await Promise.all([getMealReminders(), listHabits(), listNoteReminders(), Notifications.getAllScheduledNotificationsAsync()]);
  const wanted = new Map<string, Wanted>();
  for (const meal of meals) if (meal.enabled) wanted.set(`${PREFIX}meal:${meal.name}:${meal.time}`, { body: `Log your ${meal.name.toLowerCase()}`, trigger: repeating(meal.time) });
  for (const habit of habits) if (habit.reminderTime) {
    for (let day = 0; day < 7; day += 1) if (habit.activeDays & (1 << day)) {
      wanted.set(`${PREFIX}habit:${habit.id}:${day}:${habit.reminderTime}:${habit.name}`, { body: habit.name, trigger: repeating(habit.reminderTime, (day + 1) % 7 + 1) });
    }
  }
  // One-off note reminders; past ones have fired and stay only as a mark on the note.
  for (const note of notes) if (note.reminderAt && Date.parse(note.reminderAt) > Date.now()) {
    wanted.set(`${PREFIX}note:${note.id}:${note.reminderAt}:${note.title}`, { body: note.title.trim() || 'Note reminder', url: `/note/${note.id}`,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(note.reminderAt), channelId: CHANNEL } });
  }
  await addSpendingRecaps(wanted, new Date());
  for (const existing of scheduled) if (existing.identifier.startsWith(PREFIX) && !wanted.has(existing.identifier)) await Notifications.cancelScheduledNotificationAsync(existing.identifier);
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  const existingIds = new Set(scheduled.map((item) => item.identifier));
  for (const [identifier, reminder] of wanted) if (!existingIds.has(identifier)) {
    await Notifications.scheduleNotificationAsync({ identifier, trigger: reminder.trigger,
      content: { title: reminder.title ?? 'Mossday', body: reminder.body, sound: 'default', data: reminder.url ? { url: reminder.url } : {} } });
  }
}
