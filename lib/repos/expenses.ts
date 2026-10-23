import { read, write, requireDate, requireName } from './store';

export type Category = { id: number; name: string; icon: string; color: string; type: 'MEAL' | 'OTHER'; lastAmount: number | null; isUserCreated: number };
export type Expense = {
  id: number; amount: number; categoryId: number | null; title: string | null; note: string | null;
  date: string; createdAt: string; paymentMethod: 'CASH' | 'CARD' | 'ONLINE'; isOneTime: number;
  categoryName?: string; categoryIcon?: string; categoryColor?: string;
};
export type ExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'categoryName' | 'categoryIcon' | 'categoryColor'>;

export const listCategories = () => read((db) => db.getAllAsync<Category>('SELECT * FROM categories WHERE archived=0 ORDER BY type DESC, sortOrder, id'));
/** Keep the category row for historical expenses; only remove it from the picker. */
export const deleteCategory = (id: number) => write(async (db) => {
  const result = await db.runAsync('UPDATE categories SET archived=1 WHERE id=? AND isUserCreated=1 AND archived=0', id);
  if (!result.changes) throw new Error('Only custom categories can be deleted.');
});
export const restoreCategory = (id: number) => write(async (db) => {
  await db.runAsync('UPDATE categories SET archived=0 WHERE id=? AND isUserCreated=1', id);
});
/** Only reorder the supplied categories; meal ordering is independent of Other. */
export const reorderCategories = (ids: number[]) => write(async (db) => {
  if (new Set(ids).size !== ids.length) throw new Error('Category order contains duplicates.');
  for (const [index, id] of ids.entries()) {
    const result = await db.runAsync('UPDATE categories SET sortOrder=? WHERE id=?', index, id);
    if (!result.changes) throw new Error('Category no longer exists.');
  }
});
export const listExpenses = (from: string, to = from) => read((db) => db.getAllAsync<Expense>(
  `SELECT e.*, c.name AS categoryName, c.icon AS categoryIcon, c.color AS categoryColor
   FROM expenses e LEFT JOIN categories c ON c.id = e.categoryId WHERE date BETWEEN ? AND ? ORDER BY createdAt DESC, e.id DESC`, from, to));

export function saveExpense(input: ExpenseInput, id?: number) {
  requireDate(input.date);
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new Error('Enter a valid amount.');
  if (!['CASH', 'CARD', 'ONLINE'].includes(input.paymentMethod)) throw new Error('Choose a payment method.');
  if (input.isOneTime) requireName(input.title ?? '');
  else if (!input.categoryId) throw new Error('Choose a category.');
  return write(async (db) => {
    const values = [input.amount, input.isOneTime ? null : input.categoryId, input.title?.trim() || null,
      input.note?.trim() || null, input.date, input.paymentMethod, input.isOneTime ? 1 : 0];
    if (id) await db.runAsync('UPDATE expenses SET amount=?, categoryId=?, title=?, note=?, date=?, paymentMethod=?, isOneTime=? WHERE id=?', ...values, id);
    else await db.runAsync('INSERT INTO expenses(amount,categoryId,title,note,date,paymentMethod,isOneTime,createdAt) VALUES (?,?,?,?,?,?,?,?)', ...values, new Date().toISOString());
    if (!input.isOneTime) await db.runAsync('UPDATE categories SET lastAmount=? WHERE id=?', input.amount, input.categoryId);
  });
}

export const deleteExpense = (id: number) => write(async (db) => { await db.runAsync('DELETE FROM expenses WHERE id=?', id); });
export const restoreExpense = (e: Expense) => write(async (db) => {
  await db.runAsync('INSERT INTO expenses(id,amount,categoryId,title,note,date,createdAt,paymentMethod,isOneTime) VALUES (?,?,?,?,?,?,?,?,?)',
    e.id, e.amount, e.categoryId, e.title, e.note, e.date, e.createdAt, e.paymentMethod, e.isOneTime);
});
export function addCategory(name: string, icon: string, color: string) {
  const clean = requireName(name);
  return write(async (db) => {
    const result = await db.runAsync("INSERT INTO categories(name,icon,color,type,sortOrder) VALUES (?,?,?,'OTHER',(SELECT COALESCE(MAX(sortOrder),-1)+1 FROM categories WHERE type='OTHER'))", clean, icon, color);
    return result.lastInsertRowId;
  });
}
