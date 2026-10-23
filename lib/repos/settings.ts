import { read, write } from './store';
import { isCurrencyCode, setActiveCurrency, type CurrencyCode } from '../currency';
export type Settings = { appearance: 'system' | 'light' | 'dark'; dailyBudget: number; monthlyBudget: number; currency: CurrencyCode; currencyPrompted: boolean };
export const defaultSettings: Settings = { appearance: 'system', dailyBudget: 0, monthlyBudget: 0, currency: 'LKR', currencyPrompted: false };
export async function getSettings(): Promise<Settings> {
  const rows = await read((db) => db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings'));
  const values = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { appearance: values.appearance === 'light' || values.appearance === 'dark' ? values.appearance : 'system',
    dailyBudget: Number(values.dailyBudget) || 0, monthlyBudget: Number(values.monthlyBudget) || 0,
    currency: isCurrencyCode(values.currency) ? values.currency : 'LKR', currencyPrompted: values.currencyPrompted === '1' };
}
export const setSetting = (key: keyof Settings, value: string | number) => write(async (db) => {
  if (key === 'currency' && !isCurrencyCode(value)) throw new Error('Choose a supported currency.');
  await db.runAsync('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, String(value));
}).then(() => { if (key === 'currency' && isCurrencyCode(value)) setActiveCurrency(value); });
/** Choosing or skipping the first-launch prompt is saved atomically with the preference. */
export const completeCurrencySetup = (currency: CurrencyCode = 'LKR') => write(async (db) => {
  if (!isCurrencyCode(currency)) throw new Error('Choose a supported currency.');
  await db.runAsync("INSERT INTO settings(key,value) VALUES ('currency',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", currency);
  await db.runAsync("INSERT INTO settings(key,value) VALUES ('currencyPrompted','1') ON CONFLICT(key) DO UPDATE SET value='1'");
}).then(() => setActiveCurrency(currency));
