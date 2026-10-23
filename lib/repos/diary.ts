import { read, write, requireDate, requireName } from './store';
export type Todo = { id: number; date: string; text: string; isDone: number; time: string | null; priority: number; sortOrder: number };
export type DiaryEntry = { date: string; text: string | null; mood: number | null };
/** Open to-dos first, then done ones, each in the saved order. */
export const listTodos = (from: string, to = from) => read((db) => db.getAllAsync<Todo>('SELECT * FROM todos WHERE date BETWEEN ? AND ? ORDER BY isDone,sortOrder,id', from, to));
export const getJournal = (date: string) => read((db) => db.getFirstAsync<DiaryEntry>('SELECT * FROM diary_entries WHERE date=?', date));
export function addTodo(date: string, text: string, time: string | null, priority = 0) {
  requireDate(date);
  const clean = requireName(text);
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Use a time such as 14:30.');
  return write(async (db) => {
    await db.runAsync('INSERT INTO todos(date,text,time,priority,sortOrder) VALUES (?,?,?,?,(SELECT COALESCE(MAX(sortOrder),0)+1 FROM todos WHERE date=?))', date, clean, time, priority, date);
  });
}
export const toggleTodo = (todo: Todo) => write(async (db) => { await db.runAsync('UPDATE todos SET isDone=? WHERE id=?', todo.isDone ? 0 : 1, todo.id); });
export const deleteTodo = (id: number) => write(async (db) => { await db.runAsync('DELETE FROM todos WHERE id=?', id); });
export const restoreTodo = (t: Todo) => write(async (db) => { await db.runAsync('INSERT INTO todos(id,date,text,isDone,time,priority,sortOrder) VALUES (?,?,?,?,?,?,?)', t.id, t.date, t.text, t.isDone, t.time, t.priority, t.sortOrder); });
export const moveIncomplete = (from: string, to: string) => write(async (db) => {
  const rows = await db.getAllAsync<Todo>('SELECT * FROM todos WHERE date=? AND isDone=0 ORDER BY sortOrder,id', from);
  const max = await db.getFirstAsync<{ n: number }>('SELECT COALESCE(MAX(sortOrder),0) AS n FROM todos WHERE date=?', to);
  for (const [index, row] of rows.entries()) await db.runAsync('UPDATE todos SET date=?,sortOrder=? WHERE id=?', to, (max?.n ?? 0) + index + 1, row.id);
});
export const reorderTodos = (ids: number[]) => write(async (db) => {
  for (const [index, id] of ids.entries()) await db.runAsync('UPDATE todos SET sortOrder=? WHERE id=?', index, id);
});
export function saveJournal(date: string, text: string, mood: number | null) {
  requireDate(date);
  if (mood !== null && (!Number.isInteger(mood) || mood < 0 || mood > 4)) throw new Error('Choose a valid mood.');
  return write(async (db) => { await db.runAsync('INSERT INTO diary_entries(date,text,mood) VALUES (?,?,?) ON CONFLICT(date) DO UPDATE SET text=excluded.text,mood=excluded.mood', date, text, mood); });
}
