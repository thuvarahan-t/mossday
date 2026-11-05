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
  assert.equal((await settings.getSettings()).currencyPrompted, false);
  await settings.completeCurrencySetup();
  assert.equal((await settings.getSettings()).currency, 'LKR', 'Skip keeps Rs.');
  assert.equal((await settings.getSettings()).currencyPrompted, true, 'The first-launch prompt stays dismissed');
  await settings.setSetting('currency', 'USD');
  assert.equal((await settings.getSettings()).currency, 'USD');
  await assert.rejects(settings.setSetting('currency', 'BAD'));
  assert.equal((await settings.getSettings()).currency, 'USD', 'Invalid preferences preserve the saved currency');
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
  await expenses.updateCategory(newCategoryId, '  Morning coffee  ', 'purple');
  const editedCategory = (await expenses.listCategories()).find((category) => category.id === newCategoryId);
  assert.equal(editedCategory.name, 'Morning coffee');
  assert.equal(editedCategory.color, 'purple');
  assert.equal((await expenses.listExpenses(yesterday))[0].categoryId, newCategoryId, 'Edits preserve expense links');
  assert.throws(() => expenses.updateCategory(newCategoryId, ' ', 'blue'));
  await assert.rejects(expenses.updateCategory(99999, 'Missing', 'blue'));
  await expenses.deleteCategory(newCategoryId);
  assert.equal((await expenses.listCategories()).some((category) => category.id === newCategoryId), false);
  assert.equal((await expenses.listExpenses(yesterday))[0].categoryName, 'Morning coffee', 'Deleting a category preserves historical expense labels');
  await assert.rejects(expenses.updateCategory(newCategoryId, 'Archived', 'blue'), /no longer exists/);
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
  const bills = load('components/expenses/monthlyBills.ts');
  const billId = bills.billCategoryId(await expenses.listCategories());
  assert.ok(billId, 'Monthly entries use the existing Bills category');
  await expenses.saveExpense({ ...input, categoryId: billId, title: 'Rent', date: '2026-09-05', amount: 2500000 });
  await expenses.saveExpense({ ...input, categoryId: billId, title: 'Electricity', date: '2026-09-18', amount: 800000 });
  const septemberBills = bills.monthlyBills(await expenses.listExpenses('2026-09-01', '2026-09-30'));
  assert.deepEqual(Array.from(septemberBills, (bill) => bill.title).sort(), ['Electricity', 'Rent']);
  assert.equal(septemberBills.reduce((total, bill) => total + bill.amount, 0), 3300000, 'Monthly total counts each bill exactly once');
  assert.equal((await expenses.listExpenses('2026-09-05'))[0].title, 'Rent', 'Monthly bill is also the actual payment for its day');
  assert.equal(bills.monthlyBills(await expenses.listExpenses('2026-10-01', '2026-10-31')).length, 0, 'Bills do not automatically repeat into another month');
  await expenses.deleteExpense(septemberBills[0].id);
  await expenses.restoreExpense(septemberBills[0]);
  assert.equal(bills.monthlyBills(await expenses.listExpenses('2026-09-01', '2026-09-30')).length, 2, 'Monthly bill undo preserves payment data');

  await habits.saveHabit({ name: 'Water', icon: '💧', color: 'green', dailyGoal: 2, activeDays: 127, reminderTime: null });
  const habit = (await habits.listHabits())[0];
  await Promise.all(Array.from({ length: 8 }, () => habits.tickHabit(habit.id, today)));
  assert.equal((await habits.listHabitLogs(today, today))[0].count, 2, 'Concurrent taps stop at the daily goal');
  await habits.tickHabit(habit.id, today, -1);
  assert.equal((await habits.listHabitLogs(today, today))[0].count, 1);
  const snapshot = await habits.deleteHabit(habit.id);
  assert.equal((await habits.listHabitLogs(today, today)).length, 0);
  await habits.restoreHabit(snapshot);
  assert.equal((await habits.listHabitLogs(today, today))[0].count, 1);
  const stats = habits.habitStats({ ...habit, createdAt: '2026-10-19T00:00:00Z', activeDays: 31 },
    { '2026-10-19': 2, '2026-10-20': 2, '2026-10-21': 2, '2026-10-22': 2, '2026-10-23': 2 }, '2026-10-25');
  assert.equal(stats.current, 5, 'Inactive weekend does not break streak');
  assert.equal(stats.best, 5);
  await habits.saveHabit({ name: 'Three times', icon: null, color: 'purple', dailyGoal: 3, activeDays: 127, reminderTime: null });
  const triple = (await habits.listHabits()).find((row) => row.name === 'Three times');
  await Promise.all(Array.from({ length: 8 }, () => habits.tickHabit(triple.id, today)));
  assert.equal((await habits.listHabitLogs(today, today)).find((row) => row.habitId === triple.id).count, 3, 'Goal 3 caps at exactly three even with rapid taps');
  await habits.tickHabit(triple.id, today, -1);
  assert.equal((await habits.listHabitLogs(today, today)).find((row) => row.habitId === triple.id).count, 2, 'A completed goal can be undone');
  const names = async () => (await habits.listHabits()).map((row) => row.name);
  assert.deepEqual(await names(), ['Water', 'Three times'], 'New habits append to the saved order');
  await habits.reorderHabits([triple.id, habit.id]);
  assert.deepEqual(await names(), ['Three times', 'Water']);
  await assert.rejects(habits.reorderHabits([triple.id, triple.id]));
  await assert.rejects(habits.reorderHabits([triple.id, 99999]));
  assert.deepEqual(await names(), ['Three times', 'Water'], 'A failed reorder rolls back');
  const reordered = await habits.deleteHabit(triple.id);
  await habits.restoreHabit(reordered);
  assert.deepEqual(await names(), ['Three times', 'Water'], 'Undo restores a deleted habit to its position');
  await habits.archiveHabit(triple.id);
  assert.deepEqual(await names(), ['Water']);
  assert.deepEqual((await habits.listArchivedHabits()).map((row) => row.name), ['Three times'], 'Archived habits stay listed for restore');
  await habits.archiveHabit(triple.id, false);
  assert.deepEqual(await names(), ['Three times', 'Water'], 'Restoring returns a habit to its old position');
  assert.equal((await habits.listArchivedHabits()).length, 0);
  await Promise.all(Array.from({ length: 5 }, () => habits.tickHabit(triple.id, today, -1)));
  assert.equal((await habits.listHabitLogs(today, today)).find((row) => row.habitId === triple.id).count, 0, 'Undo stops at zero');

  await diary.addTodo(yesterday, 'Carry me', null);
  await diary.addTodo(today, 'Stay first', '14:30', 1);
  await diary.moveIncomplete(yesterday, today);
  assert.equal((await diary.listTodos(yesterday)).length, 0);
  const todos = await diary.listTodos(today);
  assert.equal(todos.length, 2);
  assert.equal(todos[0].text, 'Stay first');
  await diary.toggleTodo(todos[0]);
  const ticked = await diary.listTodos(today);
  assert.deepEqual(ticked.map((t) => t.text), ['Carry me', 'Stay first'], 'Done to-dos sort below open ones');
  assert.equal(ticked[1].isDone, 1);
  await diary.reorderTodos(todos.map((t) => t.id).reverse());
  assert.equal((await diary.listTodos(today))[0].text, 'Carry me');
  const editable = (await diary.listTodos(today)).find((t) => t.text === 'Carry me');
  await diary.updateTodo(editable.id, today, '  Carried  ', '09:15', 1);
  const edited = (await diary.listTodos(today)).find((t) => t.id === editable.id);
  assert.deepEqual([edited.text, edited.time, edited.priority], ['Carried', '09:15', 1], 'Edits save text, time and priority');
  assert.throws(() => diary.updateTodo(editable.id, today, 'Bad', '25:00'), 'Invalid times are refused before saving');
  await assert.rejects(diary.updateTodo(99999, today, 'Gone', null));
  await diary.updateTodo(editable.id, yesterday, 'Carried', null);
  assert.equal((await diary.listTodos(yesterday))[0].id, editable.id, 'Moving a to-do to another day moves it');
  await diary.updateTodo(editable.id, today, 'Carry me', null);
  await diary.deleteTodo(todos[0].id);
  await diary.restoreTodo(todos[0]);
  assert.equal((await diary.listTodos(today)).length, 2);
  await diary.saveJournal(today, 'Saved locally', 3);
  assert.equal((await diary.getJournal(today)).text, 'Saved locally');
  await diary.saveJournal(yesterday, 'No mood picked', null);
  assert.deepEqual((await diary.listMoods(yesterday, today)).map((row) => [row.date, row.mood]), [[today, 3]],
    'Only days with a mood appear in the month calendar');
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
  const placedDraft = { ...draft, blocks: draft.blocks.map((block, index) => ({ ...block,
    layout: JSON.stringify({ x: index === 0 ? 0.1 : 0, y: index * 160, width: 0.8, ratio: 1.5 }) })) };
  await notes.saveNote(noteId, placedDraft);
  assert.equal((await notes.getNote(noteId)).blocks[0].layout, placedDraft.blocks[0].layout, 'Canvas coordinates survive a reload');
  await assert.rejects(notes.saveNote(noteId, { ...placedDraft, blocks: [{ ...placedDraft.blocks[0], layout: '{"x":3}' }] }));
  assert.equal((await notes.getNote(noteId)).blocks.length, 3, 'Invalid canvas layout rolls back the complete note');
  assert.equal((await notes.getNote(noteId)).blocks.length, 3);
  assert.equal((await notes.getNote(noteId)).note.folder, 'Ideas');
  await assert.rejects(notes.saveNote(noteId, { ...draft, blocks: [{ type: 'INVALID' }] }));
  assert.equal((await notes.getNote(noteId)).blocks.length, 3, 'Failed block save restores the entire previous draft');
  const deleted = await notes.deleteNote(noteId);
  assert.equal((await notes.listNotes()).notes.length, 0);
  await notes.restoreNote(deleted);
  assert.equal((await notes.getNote(noteId)).blocks[1].layout, placedDraft.blocks[1].layout, 'Delete Undo restores canvas placement');
  assert.equal((await notes.getNote(noteId)).blocks[1].filePath, 'test.m4a');
  assert.equal(notes.checklistItems('[{"text":"Rice","done":true}]')[0].done, true);
  assert.equal(notes.checklistItems('bad json').length, 0);
  assert.equal(notes.checklistItems('[null,1,{}]').length, 0);
  await notes.setNoteProperty(noteId, 'isPinned', 0);
  assert.equal((await notes.getNote(noteId)).note.isPinned, 0);
  await notes.setNoteProperty(noteId, 'folder', null);
  assert.deepEqual(Array.from((await notes.listNotes()).folders), [], 'No folders until the user makes or uses one');
  assert.equal(await notes.addFolder('  Recipes '), 'Recipes');
  assert.deepEqual(Array.from((await notes.listNotes()).folders), ['Recipes'], 'A new folder shows while still empty');
  await assert.rejects(notes.addFolder('recipes'), 'Folder names are unique ignoring case');
  assert.throws(() => notes.addFolder('All'), '"All" is the built-in filter');
  assert.throws(() => notes.addFolder('   '));
  await notes.setNoteProperty(noteId, 'folder', 'Ideas');
  assert.deepEqual(Array.from((await notes.listNotes()).folders), ['Ideas', 'Recipes'], 'Folders that notes use are listed too, alphabetically');
  await assert.rejects(notes.addFolder('IDEAS'), 'A folder in use cannot be added again');
  const copyId = await notes.duplicateNote(noteId);
  const copy = await notes.getNote(copyId);
  assert.equal(copy.blocks[0].layout, (await notes.getNote(noteId)).blocks[0].layout, 'Copy preserves canvas placement and image sizing');
  assert.equal(copy.note.title, 'Recipe');
  assert.deepEqual(copy.blocks.map((b) => b.type), (await notes.getNote(noteId)).blocks.map((b) => b.type), 'A copy keeps every block in order');
  assert.equal(copy.note.isPinned, 0);
  await notes.setNoteProperty(noteId, 'isPinned', 1);
  await notes.setNoteArchived(noteId, true);
  assert.deepEqual((await notes.listNotes()).notes.map((n) => n.id), [copyId], 'Archived notes leave the grid');
  assert.ok((await notes.listNotes()).blocks.every((b) => b.noteId === copyId), 'Only shown notes bring their blocks');
  const archived = await notes.listNotes(true);
  assert.deepEqual(archived.notes.map((n) => n.id), [noteId]);
  assert.equal(archived.notes[0].isPinned, 0, 'Archiving unpins, like Keep');
  assert.ok(archived.folders.includes('Ideas'), 'Folders used only by archived notes still exist');
  await notes.setNoteArchived(noteId, false);
  assert.equal((await notes.listNotes()).notes.length, 2);
  const later = new Date(Date.now() + 86_400_000).toISOString();
  await notes.setNoteReminder(noteId, later);
  assert.deepEqual(Array.from(await notes.listNoteReminders(), (r) => r.reminderAt), [later]);
  assert.throws(() => notes.setNoteReminder(noteId, '2020-01-01T00:00:00.000Z'), 'Reminders must be in the future');
  const withReminder = await notes.deleteNote(noteId);
  assert.equal((await notes.listNoteReminders()).length, 0, 'A deleted note takes its reminder along');
  await notes.restoreNote(withReminder);
  assert.equal((await notes.getNote(noteId)).note.reminderAt, later, 'Undo brings the reminder back');
  await notes.setNoteReminder(noteId, null);
  assert.equal((await notes.listNoteReminders()).length, 0);
  await notes.deleteNote(copyId);
  const orderIds = [noteId, await notes.createNote(), await notes.createNote(), await notes.createNote()];
  const orderedIds = async () => Array.from((await notes.listNotes()).notes, (note) => note.id);
  await notes.reorderNotes(orderIds);
  assert.deepEqual(await orderedIds(), orderIds, 'Manual note order persists after a reload');
  await notes.setNoteProperty(noteId, 'color', 'blue');
  assert.deepEqual(await orderedIds(), orderIds, 'Editing does not move a manually placed note');
  await notes.reorderNotes([orderIds[3], orderIds[1]]);
  const filteredOrder = [orderIds[0], orderIds[3], orderIds[2], orderIds[1]];
  assert.deepEqual(await orderedIds(), filteredOrder, 'Filtered reorder preserves hidden slots');
  await assert.rejects(notes.reorderNotes([orderIds[0], orderIds[0]]));
  await assert.rejects(notes.reorderNotes([orderIds[0], 99999]));
  assert.deepEqual(await orderedIds(), filteredOrder, 'Invalid reorder preserves the entire order');
  await notes.setNoteProperty(orderIds[2], 'isPinned', 1);
  await assert.rejects(notes.reorderNotes([orderIds[0], orderIds[2]]), /separately/);
  assert.equal((await orderedIds())[0], orderIds[2], 'Pinned notes stay above others');
  const newId = await notes.createNote();
  assert.equal((await orderedIds())[1], newId, 'New notes lead the unpinned group');
  await notes.setNoteArchived(orderIds[1], true);
  await assert.rejects(notes.reorderNotes([orderIds[0], orderIds[1]]));
  sqlite.close();
  console.log('Repositories verified: CRUD, undo, rollback, concurrent ticks, streaks, carry-over, reorder, journal, settings.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
