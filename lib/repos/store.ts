import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../db';

const listeners = new Set<(topic: string) => void>();
let pending: Promise<unknown> = Promise.resolve();

export function subscribeToStore(listener: (topic: string) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Serialize writes: SQLite transactions on one shared connection must not overlap. */
export function write<T>(operation: (db: SQLiteDatabase) => Promise<T>, topic = 'data'): Promise<T> {
  const result = pending.then(async () => {
    const db = await getDatabase();
    let value!: T;
    await db.withTransactionAsync(async () => { value = await operation(db); });
    listeners.forEach((listener) => listener(topic));
    return value;
  });
  pending = result.catch(() => undefined);
  return result;
}

export async function read<T>(operation: (db: SQLiteDatabase) => Promise<T>): Promise<T> {
  await pending;
  return operation(await getDatabase());
}

export function requireName(name: string) {
  if (!name.trim()) throw new Error('Please enter a name.');
  return name.trim();
}

export function requireDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== Number(date.slice(0, 4)) || parsed.getMonth() + 1 !== Number(date.slice(5, 7)) ||
      parsed.getDate() !== Number(date.slice(8, 10))) throw new Error('Choose a valid date.');
}
