import { addDays, todayLocalDate } from '../date';
import { isActiveDay } from '../heatmap';
import { read, write, requireDate, requireName } from './store';

export type Habit = { id: number; name: string; icon: string | null; color: string; dailyGoal: number; activeDays: number; reminderTime: string | null; createdAt: string; archived: number };
export type HabitInput = Pick<Habit, 'name' | 'icon' | 'color' | 'dailyGoal' | 'activeDays' | 'reminderTime'>;
export type HabitLog = { habitId: number; date: string; count: number };
export const listHabits = () => read((db) => db.getAllAsync<Habit>('SELECT * FROM habits WHERE archived=0 ORDER BY id'));
export const getHabit = (id: number) => read((db) => db.getFirstAsync<Habit>('SELECT * FROM habits WHERE id=?', id));
export const listHabitLogs = (from: string, to: string) => read((db) => db.getAllAsync<HabitLog>('SELECT * FROM habit_logs WHERE date BETWEEN ? AND ?', from, to));
export function saveHabit(input: HabitInput, id?: number) {
  const name = requireName(input.name);
  if (!Number.isInteger(input.dailyGoal) || input.dailyGoal < 1 || input.dailyGoal > 100) throw new Error('Daily goal must be 1–100.');
  if (!Number.isInteger(input.activeDays) || input.activeDays < 1 || input.activeDays > 127) throw new Error('Choose at least one active day.');
  return write(async (db) => {
    const values = [name, input.icon, input.color, input.dailyGoal, input.activeDays, input.reminderTime];
    if (id) await db.runAsync('UPDATE habits SET name=?,icon=?,color=?,dailyGoal=?,activeDays=?,reminderTime=? WHERE id=?', ...values, id);
    else await db.runAsync('INSERT INTO habits(name,icon,color,dailyGoal,activeDays,reminderTime,createdAt) VALUES (?,?,?,?,?,?,?)', ...values, new Date().toISOString());
  });
}
export function tickHabit(id: number, date: string, delta = 1) {
  requireDate(date);
  if (date > todayLocalDate()) throw new Error('Future days cannot be edited.');
  if (delta !== 1 && delta !== -1) throw new Error('Invalid tick.');
  return write(async (db) => {
    await db.runAsync(`INSERT INTO habit_logs(habitId,date,count) VALUES (?,?,?)
      ON CONFLICT(habitId,date) DO UPDATE SET count=MAX(0,count+?)`, id, date, Math.max(0, delta), delta);
  });
}
export const archiveHabit = (id: number, archived = true) => write(async (db) => { await db.runAsync('UPDATE habits SET archived=? WHERE id=?', archived ? 1 : 0, id); });
export async function deleteHabit(id: number) {
  return write(async (db) => {
    const habit = await db.getFirstAsync<Habit>('SELECT * FROM habits WHERE id=?', id);
    const logs = await db.getAllAsync<HabitLog>('SELECT * FROM habit_logs WHERE habitId=?', id);
    await db.runAsync('DELETE FROM habits WHERE id=?', id);
    return { habit, logs };
  });
}
export const restoreHabit = (snapshot: Awaited<ReturnType<typeof deleteHabit>>) => write(async (db) => {
  const h = snapshot.habit;
  if (!h) return;
  await db.runAsync('INSERT INTO habits(id,name,icon,color,dailyGoal,activeDays,reminderTime,createdAt,archived) VALUES (?,?,?,?,?,?,?,?,?)',
    h.id, h.name, h.icon, h.color, h.dailyGoal, h.activeDays, h.reminderTime, h.createdAt, h.archived);
  for (const log of snapshot.logs) await db.runAsync('INSERT INTO habit_logs(habitId,date,count) VALUES (?,?,?)', h.id, log.date, log.count);
});

/** Inactive weekdays pause a streak. Today's incomplete goal does not erase yesterday's streak. */
export function habitStats(habit: Habit, counts: Readonly<Record<string, number>>, today = todayLocalDate()) {
  const first = todayLocalDate(new Date(habit.createdAt));
  let current = 0, best = 0, run = 0, eligible = 0, completed = 0, total = 0;
  const start = first > today ? today : first;
  for (let day = start; day <= today; day = addDays(day, 1)) {
    const count = counts[day] ?? 0;
    total += count;
    if (!isActiveDay(habit.activeDays, day)) continue;
    eligible += 1;
    if (count >= habit.dailyGoal) { run += 1; completed += 1; best = Math.max(best, run); }
    else if (day !== today) run = 0;
    current = run;
  }
  return { current, best, total, completion: eligible ? Math.round(completed / eligible * 100) : 0 };
}
