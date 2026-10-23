import type { Expense } from '@/lib/repos/expenses';

/** Multiple entries on one day count once; unrecorded calendar days never dilute the average. */
export function recordedDayAverage(expenses: readonly Pick<Expense, 'date' | 'amount'>[]) {
  const days = new Set(expenses.map((expense) => expense.date)).size;
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return { days, amount: days ? Math.round(total / days) : 0 };
}
