import { read, write } from './store';
export type Settings = { appearance: 'system' | 'light' | 'dark'; dailyBudget: number; monthlyBudget: number; currency: 'LKR' };
export const defaultSettings: Settings = { appearance: 'system', dailyBudget: 0, monthlyBudget: 0, currency: 'LKR' };
export async function getSettings(): Promise<Settings> {
  const rows = await read((db) => db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings'));
  const values = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { appearance: values.appearance === 'light' || values.appearance === 'dark' ? values.appearance : 'system',
    dailyBudget: Number(values.dailyBudget) || 0, monthlyBudget: Number(values.monthlyBudget) || 0, currency: 'LKR' };
}
export const setSetting = (key: keyof Settings, value: string | number) => write(async (db) => {
  await db.runAsync('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, String(value));
});
