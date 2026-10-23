import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

const DATABASE_NAME = 'mossday.db';
const SCHEMA_VERSION = 2;
// A shared promise prevents duplicate initialization under React Strict Mode.
let databasePromise: Promise<SQLiteDatabase> | undefined;

const initialCategories = [
  ['Breakfast', 'sunny-outline', '#FEF3C7', 'MEAL', 1],
  ['Lunch', 'restaurant-outline', '#FFEDD5', 'MEAL', 1],
  ['Dinner', 'moon-outline', '#EDE9FE', 'MEAL', 1],
  ['Snacks/Tea', 'cafe-outline', '#FEF3C7', 'OTHER', 0],
  ['Transport', 'bus-outline', '#DBEAFE', 'OTHER', 0],
  ['Groceries', 'basket-outline', '#DCFCE7', 'OTHER', 0],
  ['Bills', 'receipt-outline', '#E0E7FF', 'OTHER', 0],
  ['Shopping', 'bag-handle-outline', '#FCE7F3', 'OTHER', 0],
  ['Education', 'school-outline', '#E0F2FE', 'OTHER', 0],
  ['Health', 'medical-outline', '#FFE4E6', 'OTHER', 0],
  ['Entertainment', 'game-controller-outline', '#F3E8FF', 'OTHER', 0],
] as const;

async function initializeDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  try {
    await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((version?.user_version ?? 0) < 1) {
      // Schema, seeds, and migration marker either all succeed or all roll back.
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL, icon TEXT NOT NULL, color TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('MEAL','OTHER')),
            sortOrder INTEGER NOT NULL DEFAULT 0,
            isDefault INTEGER NOT NULL DEFAULT 0, lastAmount INTEGER
          );
          CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount INTEGER NOT NULL,
            categoryId INTEGER REFERENCES categories(id), title TEXT, note TEXT,
            date TEXT NOT NULL, createdAt TEXT NOT NULL, paymentMethod TEXT,
            isOneTime INTEGER NOT NULL DEFAULT 0
          );
          CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL, icon TEXT, color TEXT NOT NULL DEFAULT '#22C55E',
            dailyGoal INTEGER NOT NULL DEFAULT 1,
            activeDays INTEGER NOT NULL DEFAULT 127,
            reminderTime TEXT, createdAt TEXT NOT NULL,
            archived INTEGER NOT NULL DEFAULT 0
          );
          CREATE TABLE IF NOT EXISTS habit_logs (
            habitId INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
            date TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY(habitId, date)
          );
          CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL, text TEXT NOT NULL,
            isDone INTEGER NOT NULL DEFAULT 0, time TEXT,
            priority INTEGER NOT NULL DEFAULT 0, sortOrder INTEGER NOT NULL DEFAULT 0
          );
          CREATE TABLE IF NOT EXISTS diary_entries (
            date TEXT PRIMARY KEY, text TEXT, mood INTEGER
          );
          CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL DEFAULT '', folder TEXT, color TEXT,
            isPinned INTEGER NOT NULL DEFAULT 0,
            createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS note_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            noteId INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
            type TEXT NOT NULL CHECK(type IN ('TEXT','IMAGE','VOICE','CHECKLIST')),
            content TEXT, filePath TEXT, durationMs INTEGER, position INTEGER NOT NULL
          );
          CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
        `);
        for (const [sortOrder, category] of initialCategories.entries()) {
          const [name, icon, color, type, isDefault] = category;
          await db.runAsync(
            'INSERT INTO categories (name, icon, color, type, sortOrder, isDefault) VALUES (?, ?, ?, ?, ?, ?)',
            name, icon, color, type, sortOrder, isDefault,
          );
        }
        await db.execAsync('PRAGMA user_version = 1;');
      });
    }
    if ((version?.user_version ?? 0) < SCHEMA_VERSION) {
      await db.withTransactionAsync(async () => {
        await db.execAsync(`
          CREATE INDEX IF NOT EXISTS expenses_by_date ON expenses(date, createdAt);
          CREATE INDEX IF NOT EXISTS todos_by_date ON todos(date, sortOrder);
          CREATE INDEX IF NOT EXISTS logs_by_date ON habit_logs(date, habitId);
          CREATE INDEX IF NOT EXISTS blocks_by_note ON note_blocks(noteId, position);
          CREATE INDEX IF NOT EXISTS notes_by_update ON notes(isPinned, updatedAt);
          PRAGMA user_version = 2;
        `);
      });
    }
    return db;
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}

/** Future repositories share this connection; route components do not execute SQL. */
export function getDatabase(): Promise<SQLiteDatabase> {
  databasePromise ??= initializeDatabase().catch((error: unknown) => {
    databasePromise = undefined;
    throw error;
  });
  return databasePromise;
}
