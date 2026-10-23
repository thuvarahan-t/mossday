import { formatClock } from '@/lib/date';
import type { Expense } from '@/lib/repos/expenses';
import { categoryStyle, type CategoryStyle } from './categoryStyle';

export type CategoryTotal = { name: string; amount: number; style: CategoryStyle };

export const sum = (expenses: Expense[]) => expenses.reduce((total, e) => total + e.amount, 0);

export function categoryTotals(expenses: Expense[]): CategoryTotal[] {
  const totals = new Map<string, CategoryTotal>();
  for (const e of expenses) {
    const name = e.categoryName ?? 'One-time';
    const entry = totals.get(name) ?? { name, amount: 0, style: categoryStyle(e.categoryIcon, e.categoryColor) };
    entry.amount += e.amount;
    totals.set(name, entry);
  }
  return [...totals.values()].sort((a, b) => b.amount - a.amount);
}

/** "7:40", "18:10 · One-time", "12:50 · Card" — cash is the default and stays implicit. */
export function expenseDetail(expense: Expense) {
  const parts = [formatClock(new Date(expense.createdAt))];
  if (expense.isOneTime) parts.push('One-time');
  if (expense.paymentMethod !== 'CASH') parts.push(expense.paymentMethod[0] + expense.paymentMethod.slice(1).toLowerCase());
  return parts.join(' · ');
}
