import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { listHabits } from './repos/habits';
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

/** Reconcile OS schedules from saved preferences; never ask for permissions at startup. */
export async function syncReminders() {
  const [meals, habits, scheduled] = await Promise.all([getMealReminders(), listHabits(), Notifications.getAllScheduledNotificationsAsync()]);
  const wanted = new Map<string, { title: string; time: string; weekday?: number }>();
  for (const meal of meals) if (meal.enabled) wanted.set(`${PREFIX}meal:${meal.name}:${meal.time}`, { title: `Log your ${meal.name.toLowerCase()}`, time: meal.time });
  for (const habit of habits) if (habit.reminderTime) {
    for (let day = 0; day < 7; day += 1) if (habit.activeDays & (1 << day)) {
      wanted.set(`${PREFIX}habit:${habit.id}:${day}:${habit.reminderTime}:${habit.name}`, { title: habit.name, time: habit.reminderTime, weekday: (day + 1) % 7 + 1 });
    }
  }
  for (const existing of scheduled) if (existing.identifier.startsWith(PREFIX) && !wanted.has(existing.identifier)) await Notifications.cancelScheduledNotificationAsync(existing.identifier);
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  const existingIds = new Set(scheduled.map((item) => item.identifier));
  for (const [identifier, reminder] of wanted) if (!existingIds.has(identifier)) {
    validateTime(reminder.time);
    const [hour, minute] = reminder.time.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({ identifier, content: { title: 'Mossday', body: reminder.title, sound: 'default' },
      trigger: reminder.weekday ? { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: reminder.weekday, hour, minute, channelId: CHANNEL }
        : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
    });
  }
}
