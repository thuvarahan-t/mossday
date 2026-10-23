const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

async function main() {
  const sqlite = new DatabaseSync(':memory:');
  const db = {
    execAsync: async (sql) => sqlite.exec(sql),
    getFirstAsync: async (sql, ...params) => sqlite.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql, ...params) => sqlite.prepare(sql).all(...params),
    runAsync: async (sql, ...params) => {
      const result = sqlite.prepare(sql).run(...params);
      return { changes: result.changes, lastInsertRowId: Number(result.lastInsertRowid) };
    },
    closeAsync: async () => {},
    withTransactionAsync: async (operation) => {
      sqlite.exec('BEGIN');
      try { await operation(); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, {
      exports, Date, Intl,
      require: (name) => {
        if (name === 'expo-sqlite') return { openDatabaseAsync: async () => db };
        assert.ok(name.startsWith('.'), `Unexpected import: ${name}`);
        return load(path.resolve(path.dirname(file), `${name}.ts`));
      },
    }, { filename: file });
    return exports;
  }
  const expenses = load('lib/repos/expenses.ts');
  const habits = load('lib/repos/habits.ts');
  const diary = load('lib/repos/diary.ts');
  const settings = load('lib/repos/settings.ts');
  const notes = load('lib/repos/notes.ts');
  const date = load('lib/date.ts');
  const today = date.todayLocalDate();
  const yesterday = date.addDays(today, -1);
  const categories = await expenses.listCategories();
  assert.equal(categories.length, 11);
  const lunch = categories.find((category) => category.name === 'Lunch');
  const otherIds = categories.filter((category) => category.type === 'OTHER').map((category) => category.id).reverse();
  await expenses.reorderCategories(otherIds);
  assert.deepEqual(Array.from(await expenses.listCategories()).filter((category) => category.type === 'OTHER').map((category) => category.id), otherIds,
    'Category drag order persists when the picker reloads');
  assert.equal((await expenses.listCategories()).filter((category) => category.type === 'MEAL')[1].id, lunch.id, 'Other ordering preserves meals');
  await assert.rejects(expenses.reorderCategories([otherIds[0], 99999]));
  assert.deepEqual(Array.from(await expenses.listCategories()).filter((category) => category.type === 'OTHER').map((category) => category.id), otherIds,
    'Invalid reorder rolls back the whole transaction');
  await assert.rejects(expenses.reorderCategories([otherIds[0], otherIds[0]]));
  const newCategoryId = await expenses.addCategory('Coffee', 'tag', 'green');
  assert.equal((await expenses.listCategories()).filter((category) => category.type === 'OTHER').at(-1).id, newCategoryId, 'New categories append after the saved order');
  assert.equal((await expenses.listCategories()).find((category) => category.id === newCategoryId).isUserCreated, 1);
  await assert.rejects(expenses.deleteCategory(lunch.id), /Only custom/);
  await assert.rejects(expenses.deleteCategory(otherIds[0]), /Only custom/, 'Built-in Other categories are protected too');
  await expenses.saveExpense({ amount: 200, categoryId: newCategoryId, title: null, note: null, date: yesterday, paymentMethod: 'CASH', isOneTime: 0 });
  await expenses.deleteCategory(newCategoryId);
  assert.equal((await expenses.listCategories()).some((category) => category.id === newCategoryId), false);
  assert.equal((await expenses.listExpenses(yesterday))[0].categoryName, 'Coffee', 'Deleting a category preserves historical expense labels');
  assert.equal((await expenses.listExpenses(yesterday))[0].amount, 200);
  await expenses.restoreCategory(newCategoryId);
  assert.equal((await expenses.listCategories()).some((category) => category.id === newCategoryId), true, 'Undo restores custom categories');
  const input = { amount: 45000, categoryId: lunch.id, title: null, note: 'Test', date: today, paymentMethod: 'CASH', isOneTime: 0 };
  await expenses.saveExpense(input);
  let rows = await expenses.listExpenses(today);
  assert.equal(rows[0].categoryName, 'Lunch');
  assert.equal((await expenses.listCategories()).find((c) => c.id === lunch.id).lastAmount, 45000);
  await expenses.saveExpense({ ...input, amount: 50000 }, rows[0].id);
  rows = await expenses.listExpenses(today);
  assert.equal(rows[0].amount, 50000);
  await expenses.deleteExpense(rows[0].id);
  assert.equal((await expenses.listExpenses(today)).length, 0);
  await expenses.restoreExpense(rows[0]);
  assert.equal((await expenses.listExpenses(today)).length, 1);
  assert.throws(() => expenses.saveExpense({ ...input, amount: 0 }));
  assert.throws(() => expenses.saveExpense({ ...input, date: '2026-02-30' }));
  await assert.rejects(expenses.saveExpense({ ...input, categoryId: 99999 }));
  assert.equal((await expenses.listExpenses(today)).length, 1, 'Failed insert rolls back');

  await habits.saveHabit({ name: 'Water', icon: '💧', color: 'green', dailyGoal: 2, activeDays: 127, reminderTime: null });
  const habit = (await habits.listHabits())[0];
  await Promise.all(Array.from({ length: 8 }, () => habits.tickHabit(habit.id, today)));
  assert.equal((await habits.listHabitLogs(today, today))[0].count, 8, 'Concurrent taps preserve every tick');
  await habits.tickHabit(habit.id, today, -1);
  assert.equal((await habits.listHabitLogs(today, today))[0].count, 7);
  const snapshot = await habits.deleteHabit(habit.id);
  assert.equal((await habits.listHabitLogs(today, today)).length, 0);
  await habits.restoreHabit(snapshot);
  assert.equal((await habits.listHabitLogs(today, today))[0].count, 7);
  const stats = habits.habitStats({ ...habit, createdAt: '2026-10-19T00:00:00Z', activeDays: 31 },
    { '2026-10-19': 2, '2026-10-20': 2, '2026-10-21': 2, '2026-10-22': 2, '2026-10-23': 2 }, '2026-10-25');
  assert.equal(stats.current, 5, 'Inactive weekend does not break streak');
  assert.equal(stats.best, 5);

  await diary.addTodo(yesterday, 'Carry me', null);
  await diary.addTodo(today, 'Stay first', '14:30', 1);
  await diary.moveIncomplete(yesterday, today);
  assert.equal((await diary.listTodos(yesterday)).length, 0);
  const todos = await diary.listTodos(today);
  assert.equal(todos.length, 2);
  assert.equal(todos[0].text, 'Stay first');
  await diary.toggleTodo(todos[0]);
  assert.equal((await diary.listTodos(today))[0].isDone, 1);
  await diary.reorderTodos(todos.map((t) => t.id).reverse());
  assert.equal((await diary.listTodos(today))[0].text, 'Carry me');
  await diary.deleteTodo(todos[0].id);
  await diary.restoreTodo(todos[0]);
  assert.equal((await diary.listTodos(today)).length, 2);
  await diary.saveJournal(today, 'Saved locally', 3);
  assert.equal((await diary.getJournal(today)).text, 'Saved locally');
  await settings.setSetting('appearance', 'dark');
  await settings.setSetting('dailyBudget', 200000);
  assert.equal((await settings.getSettings()).dailyBudget, 200000);
  assert.equal((await settings.getSettings()).appearance, 'dark');
  const noteId = await notes.createNote();
  const draft = { title: 'Recipe', folder: 'Ideas', color: null, isPinned: 1, blocks: [
    { type: 'TEXT', content: 'Ingredients', filePath: null, durationMs: null },
    { type: 'VOICE', content: null, filePath: 'test.m4a', durationMs: 42000 },
    { type: 'CHECKLIST', content: '[{"text":"Rice","done":true}]', filePath: null, durationMs: null },
  ] };
  await notes.saveNote(noteId, draft);
  assert.equal((await notes.getNote(noteId)).blocks.length, 3);
  assert.equal((await notes.getNote(noteId)).note.folder, 'Ideas');
  await assert.rejects(notes.saveNote(noteId, { ...draft, blocks: [{ type: 'INVALID' }] }));
  assert.equal((await notes.getNote(noteId)).blocks.length, 3, 'Failed block save restores the entire previous draft');
  const deleted = await notes.deleteNote(noteId);
  assert.equal((await notes.listNotes()).notes.length, 0);
  await notes.restoreNote(deleted);
  assert.equal((await notes.getNote(noteId)).blocks[1].filePath, 'test.m4a');
  assert.equal(notes.checklistItems('[{"text":"Rice","done":true}]')[0].done, true);
  assert.equal(notes.checklistItems('bad json').length, 0);
  assert.equal(notes.checklistItems('[null,1,{}]').length, 0);
  await notes.setNoteProperty(noteId, 'isPinned', 0);
  assert.equal((await notes.getNote(noteId)).note.isPinned, 0);
  sqlite.close();
  console.log('Repositories verified: CRUD, undo, rollback, concurrent ticks, streaks, carry-over, reorder, journal, settings.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
