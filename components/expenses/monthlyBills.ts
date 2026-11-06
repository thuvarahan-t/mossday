import type { Category, Expense } from '@/lib/repos/expenses';

const MONTHLY_BILL_CHIPS = ['Electricity', 'Water', 'Rent'];
/** Matched by name: a user's own "Rent" category takes the chip instead of a duplicate. */
export const monthlyPrimaryCategories = (categories: readonly Category[]) => MONTHLY_BILL_CHIPS.flatMap((name) => categories.filter((category) => category.frequency === 'MONTHLY' && category.name.toLowerCase() === name.toLowerCase()));
export const monthlyBills = (expenses: readonly Expense[]) => expenses.filter((expense) => expense.frequency === 'MONTHLY');
