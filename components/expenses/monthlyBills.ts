import type { Category, Expense } from '@/lib/repos/expenses';

export const MONTHLY_BILL_PRESETS = ['Rent', 'Electricity', 'Water'] as const;
/** Reuse the Bills category so month/day totals and charts count each payment once. */
export const billCategoryId = (categories: readonly Category[]) => categories.find((category) => category.icon === 'bills')?.id ?? null;
export const monthlyBills = (expenses: readonly Expense[]) => expenses.filter((expense) => expense.categoryIcon === 'bills');
