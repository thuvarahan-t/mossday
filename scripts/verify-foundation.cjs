// Exercise the actual migration SQL against SQLite without an Android emulator.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    }, Intl, Date,
  }, { filename: file });
  return exports;
}

/** Rewinds the notes table to before v6, so older upgrade paths can run again. */
const DROP_V6_NOTE_COLUMNS = 'ALTER TABLE notes DROP COLUMN isArchived; ALTER TABLE notes DROP COLUMN reminderAt;';

async function main() {
  const sqlite = new DatabaseSync(':memory:');
  const adapter = {
    execAsync: async (sql) => sqlite.exec(sql),
    getFirstAsync: async (sql) => sqlite.prepare(sql).get(),
    runAsync: async (sql, ...params) => sqlite.prepare(sql).run(...params),
    closeAsync: async () => {},
    withTransactionAsync: async (task) => {
      sqlite.exec('BEGIN');
      try { await task(); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const dependencies = { 'expo-sqlite': { openDatabaseAsync: async (name) => {
    assert.equal(name, 'mossday.db');
    return adapter;
  } } };
  const module = load('lib/db.ts', dependencies);
  const first = module.getDatabase();
  assert.equal(first, module.getDatabase(), 'Startup calls must share one initialization');
  await first;
  assert.equal(sqlite.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM categories').get().n, 11);
  assert.deepEqual(sqlite.prepare('SELECT name FROM categories WHERE type = ? ORDER BY sortOrder')
    .all('MEAL').map((row) => row.name), ['Breakfast', 'Lunch', 'Dinner']);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").get().n, 9);
  assert.throws(() => sqlite.exec("INSERT INTO categories(name,icon,color,type) VALUES ('Bad','x','x','BAD')"));
  assert.throws(() => sqlite.exec("INSERT INTO expenses(amount,categoryId,date,createdAt) VALUES (100,999,'2026-10-23','now')"));
  sqlite.exec("INSERT INTO habits(name,createdAt) VALUES ('Walk','now'); INSERT INTO habit_logs VALUES (1,'2026-10-23',1);");
  assert.throws(() => sqlite.exec("INSERT INTO habit_logs VALUES (1,'2026-10-23',2)"));
  sqlite.exec('DELETE FROM habits WHERE id=1');
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM habit_logs').get().n, 0);
  sqlite.exec("INSERT INTO notes(title,createdAt,updatedAt) VALUES ('Test','now','now'); INSERT INTO note_blocks(noteId,type,position) VALUES (1,'TEXT',0);");
  sqlite.exec('DELETE FROM notes WHERE id=1');
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM note_blocks').get().n, 0);
  sqlite.exec("DELETE FROM categories WHERE name='Fun'");
  await load('lib/db.ts', dependencies).getDatabase();
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM categories').get().n, 10, 'Restart must not reseed deleted categories');
  // Reopen an existing v1 database: indexing must preserve records and deleted seeds.
  sqlite.exec("INSERT INTO expenses(amount,date,createdAt) VALUES (45000,'2026-10-23','now')");
  for (const index of ['expenses_by_date', 'todos_by_date', 'logs_by_date', 'blocks_by_note', 'notes_by_update']) {
    sqlite.exec(`DROP INDEX ${index}`);
  }
  sqlite.exec('PRAGMA user_version = 1');
  sqlite.exec('ALTER TABLE categories DROP COLUMN isUserCreated; ALTER TABLE categories DROP COLUMN archived; ALTER TABLE habits DROP COLUMN sortOrder;');
  sqlite.exec(`${DROP_V6_NOTE_COLUMNS} INSERT INTO notes(id,title,createdAt,updatedAt) VALUES (5,'Kept','now','now');
    INSERT INTO note_blocks(noteId,type,content,position) VALUES (5,'TEXT','Body',0);`);
  sqlite.exec("INSERT INTO habits(id,name,createdAt) VALUES (7,'Read','now'),(3,'Walk','now')");
  sqlite.exec("UPDATE categories SET name='Snacks/Tea',icon='cafe-outline',color='#FEF3C7' WHERE name='Snacks'");
  sqlite.exec("UPDATE categories SET color='pink' WHERE name='Lunch'");
  await load('lib/db.ts', dependencies).getDatabase();
  assert.equal(sqlite.prepare('PRAGMA user_version').get().user_version, 6);
  assert.equal(sqlite.prepare('SELECT content FROM note_blocks WHERE noteId=5').get().content, 'Body', 'Rebuilding note blocks keeps their rows');
  assert.equal(sqlite.prepare('SELECT isArchived FROM notes WHERE id=5').get().isArchived, 0);
  sqlite.exec("INSERT INTO note_blocks(noteId,type,content,position) VALUES (5,'DRAWING','{}',1)");
  assert.throws(() => sqlite.exec("INSERT INTO note_blocks(noteId,type,position) VALUES (5,'BAD',2)"));
  sqlite.exec('DELETE FROM notes WHERE id=5');
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM note_blocks').get().n, 0, 'Rebuilt blocks still cascade with their note');
  assert.deepEqual(sqlite.prepare('SELECT name FROM habits ORDER BY sortOrder').all().map((row) => row.name), ['Walk', 'Read'],
    'Upgraded habits keep their previous creation order');
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM categories WHERE isUserCreated=1').get().n, 0, 'Seed categories remain protected after upgrade');
  assert.equal(sqlite.prepare("SELECT icon FROM categories WHERE name='Snacks'").get().icon, 'coffee');
  assert.equal(sqlite.prepare("SELECT color FROM categories WHERE name='Lunch'").get().color, 'pink', 'Preserve edited seed colours');
  assert.equal(sqlite.prepare('SELECT amount FROM expenses').get().amount, 45000);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM categories').get().n, 10);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='index' AND name LIKE '%_by_%'").get().n, 5);
  sqlite.exec("INSERT INTO categories(name,icon,color,type) VALUES ('My custom category','tag','green','OTHER')");
  sqlite.exec('ALTER TABLE categories DROP COLUMN isUserCreated; ALTER TABLE categories DROP COLUMN archived; ALTER TABLE habits DROP COLUMN sortOrder; PRAGMA user_version=3;');
  sqlite.exec(DROP_V6_NOTE_COLUMNS);
  await load('lib/db.ts', dependencies).getDatabase();
  assert.equal(sqlite.prepare("SELECT isUserCreated FROM categories WHERE name='My custom category'").get().isUserCreated, 1,
    'Upgrade recognizes existing user-created categories');
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM categories WHERE id<=11 AND isUserCreated=1').get().n, 0);
  sqlite.close();

  const currency = load('lib/currency.ts');
  const { formatMoney, formatAmount, parseAmountInput, applyKeypadKey, amountToInput } = load('lib/money.ts', { './currency': currency });
  assert.equal(parseAmountInput('450'), 45000);
  assert.equal(parseAmountInput('12.5'), 1250);
  assert.equal(parseAmountInput(''), null);
  assert.equal(parseAmountInput('0'), null);
  assert.equal(parseAmountInput('9007199254740992'), null, 'Reject amounts outside safe integer cents');
  assert.equal(parseAmountInput('1.234'), null);
  assert.equal(applyKeypadKey('45', 'invalid'), '45', 'Ignore non-keypad input');
  assert.equal(amountToInput(12550), '125.5');
  assert.equal(['4', '5', '0'].reduce(applyKeypadKey, ''), '450');
  assert.equal(['.', '5'].reduce(applyKeypadKey, ''), '0.5');
  assert.equal(['1', '.', '2', '3', '4'].reduce(applyKeypadKey, ''), '1.23', 'At most two decimals');
  assert.equal(['1', '2', '3', '4', '5', '6', '7', '8'].reduce(applyKeypadKey, ''), '1234567', 'At most seven digits');
  assert.equal(applyKeypadKey('45', 'backspace'), '4');
  assert.equal(formatMoney(125000), 'Rs. 1,250');
  assert.equal(formatMoney(125050), 'Rs. 1,250.5');
  assert.equal(formatMoney(0), 'Rs. 0');
  assert.equal(formatMoney(-125000), 'Rs. -1,250');
  currency.setActiveCurrency('USD');
  assert.equal(formatMoney(125000), '$ 1,250');
  assert.equal(formatAmount(125000), '1,250', 'Bare amounts do not depend on currency labels');
  currency.setActiveCurrency('LKR');
  assert.throws(() => formatMoney(1.5));
  const { recordedDayAverage } = load('components/expenses/expenseMetrics.ts');
  assert.equal(recordedDayAverage([]).amount, 0);
  const average = recordedDayAverage([{ date: '2026-10-01', amount: 10000 }, { date: '2026-10-01', amount: 20000 }, { date: '2026-10-15', amount: 30000 }]);
  assert.equal(average.days, 2, 'Multiple entries on the same date count as one recorded day');
  assert.equal(average.amount, 30000, 'Daily average divides by recorded dates, never by days in the month');
  const { savedTodoOrder } = load('components/diary/todoOrder.ts');
  const day = [{ id: 1, isDone: 0 }, { id: 2, isDone: 0 }, { id: 3, isDone: 1 }, { id: 4, isDone: 0 }];
  assert.deepEqual(Array.from(savedTodoOrder(day, [2, 1, 3, 4])), [2, 1, 4, 3], 'Open to-dos stay above done ones');
  assert.deepEqual(Array.from(savedTodoOrder(day, [3, 1, 2, 4])), [1, 2, 4, 3], 'A done row dragged to the top falls back below');
  assert.deepEqual(Array.from(savedTodoOrder(day, [2, 1])), [2, 1, 4, 3], 'Rows hidden by a display limit keep their place');
  const { masonryColumns } = load('components/ui/masonry.ts');
  assert.deepEqual(Array.from(masonryColumns([100, 100, 100, 100], 2), (c) => Array.from(c)), [[0, 2], [1, 3]], 'Equal cards alternate, reading left to right');
  assert.deepEqual(Array.from(masonryColumns([300, 100, 100, 100], 2), (c) => Array.from(c)), [[0], [1, 2, 3]], 'Cards fill the shorter column');
  assert.deepEqual(Array.from(masonryColumns([100, 100, 50], 2, 10), (c) => Array.from(c)), [[0, 2], [1]], 'Ties go to the leftmost column');
  assert.deepEqual(Array.from(masonryColumns([], 2), (c) => Array.from(c)), [[], []]);
  const { tabNeighbour } = load('components/navigation/tabs.ts');
  assert.equal(tabNeighbour('expenses', 1), '/', 'Past Month, Expenses swipes on to Today');
  assert.equal(tabNeighbour('expenses', -1), '/habits', 'Past Day, Expenses swipes back to Habits');
  assert.equal(tabNeighbour('index', 1), '/diary');
  assert.equal(tabNeighbour('index', -1), '/expenses');
  assert.equal(tabNeighbour('habits', -1), undefined, 'Habits is the first tab');
  assert.equal(tabNeighbour('notes', 1), undefined, 'Notes is the last tab');
  const notesRepo = load('lib/repos/notes.ts', { './store': {} });
  const noteText = load('components/notes/noteText.ts', { '@/lib/repos/notes': notesRepo });
  assert.equal(noteText.continueList('• Milk', '• Milk\n'), '• Milk\n• ', 'Return after a bullet starts the next bullet');
  assert.equal(noteText.continueList('1. Rice\n2. Dal', '1. Rice\n2. Dal\n'), '1. Rice\n2. Dal\n3. ', 'Numbers count on');
  assert.equal(noteText.continueList('  • Sub', '  • Sub\n'), '  • Sub\n  • ', 'Indented items keep their indent');
  assert.equal(noteText.continueList('• Milk\n• ', '• Milk\n• \n'), '• Milk\n', 'Return on an empty item ends the list');
  assert.equal(noteText.continueList('Plain', 'Plain\n'), 'Plain\n', 'Plain lines are left alone');
  assert.equal(noteText.continueList('• Milk', '• Milks'), '• Milks', 'Typing letters is untouched');
  assert.equal(noteText.continueList('• A\n• C', '• A\n\n• C'), '• A\n• \n• C', 'A break in the middle of a list inserts an item there');
  assert.equal(noteText.toggleList('Eggs\nBread', { start: 0, end: 10 }, 'bullet'), '• Eggs\n• Bread');
  assert.equal(noteText.toggleList('• Eggs\n• Bread', { start: 2, end: 2 }, 'bullet'), 'Eggs\n• Bread', 'Only the lines the cursor touches change');
  assert.equal(noteText.toggleList('• Eggs\n• Bread', { start: 0, end: 14 }, 'number'), '1. Eggs\n2. Bread', 'Bullets switch to numbers');
  assert.equal(noteText.toggleList('1. Eggs', { start: 0, end: 0 }, 'number'), 'Eggs', 'A second press removes the list');
  assert.equal(noteText.toggleList('\nTop', { start: 0, end: 0 }, 'bullet'), '• \nTop', 'The cursor at the very start formats the first line');
  assert.deepEqual(Array.from(noteText.textToChecklist('• Milk\n\n2. Eggs'), (i) => i.text), ['Milk', 'Eggs'], 'Checkboxes drop list markers and blank lines');
  assert.equal(noteText.textToChecklist('').length, 1, 'An empty block becomes one empty item to type in');
  assert.equal(noteText.checklistToText([{ text: 'A', done: true }, { text: 'B', done: false }]), 'A\nB');
  const order = noteText.checklistOrder([{ text: 'A', done: true }, { text: 'B', done: false }, { text: 'C', done: false }]);
  assert.deepEqual([Array.from(order.open), Array.from(order.done)], [[1, 2], [0]], 'Ticked items go under the fold, each group in its order');
  assert.deepEqual({ ...noteText.noteCounts('Shopping list', [{ type: 'TEXT', content: '• two eggs' }, { type: 'CHECKLIST', content: '[{"text":"rice","done":false}]' }, { type: 'IMAGE', content: null }]) },
    { words: 5, characters: 23 }, 'Counts skip list markers and photos');
  const history = load('components/notes/draftHistory.ts');
  let h = history.emptyHistory();
  h = history.recordEdit(h, 'a', 'text:1', 1000);
  h = history.recordEdit(h, 'ab', 'text:1', 1500);
  assert.deepEqual(Array.from(h.past), ['a'], 'Quick typing in one field is one undo step');
  h = history.recordEdit(h, 'abc', 'text:1', 5000);
  h = history.recordEdit(h, 'abcd', null, 5100);
  assert.deepEqual(Array.from(h.past), ['a', 'abc', 'abcd'], 'A pause or another kind of edit starts a new step');
  const undone = history.undo(h, 'abcde');
  assert.equal(undone.draft, 'abcd');
  const redone = history.redo(undone.history, 'abcd');
  assert.equal(redone.draft, 'abcde', 'Redo returns the undone draft');
  assert.equal(history.recordEdit(undone.history, 'abcd', null, 6000).future.length, 0, 'A new edit clears redo');
  assert.equal(history.undo(history.emptyHistory(), 'x'), null);
  const drawing = load('components/notes/drawing.ts');
  const sketch = { aspect: 1.5, strokes: [{ tool: 'pen', color: 'ink', points: [0.1, 0.5, 0.2, 0.52, 0.3, 0.55] }, { tool: 'highlighter', color: 'yellow', points: [0.8, 0.6] }] };
  const saved = drawing.parseDrawing(drawing.serializeDrawing(sketch));
  assert.equal(saved.aspect, 1.5);
  assert.equal(saved.strokes.length, 2, 'Drawings survive saving and loading');
  assert.equal(drawing.parseDrawing('{"aspect":1,"strokes":[{"tool":"laser","color":"ink","points":[0,0]},{"tool":"pen","color":"ink","points":[]}]}').strokes.length, 0, 'Unknown tools and empty strokes are dropped');
  assert.equal(drawing.parseDrawing('nope').strokes.length, 0);
  assert.match(drawing.strokePath([0.1, 0.5, 0.2, 0.52, 0.3, 0.55]), /^M0\.1 0\.5Q.*L0\.3 0\.55$/, 'Strokes are smoothed curves ending on the last point');
  assert.match(drawing.strokePath([0.8, 0.6]), /^M0\.8 0\.6l/, 'A tap draws a dot');
  assert.equal(drawing.eraseAt(sketch.strokes, 0.2, 0.53, 0.02).length, 1, 'The eraser removes a stroke it touches, whole');
  assert.equal(drawing.eraseAt(sketch.strokes, 0.5, 0.1, 0.02).length, 2, 'Erasing empty space removes nothing');
  assert.equal(drawing.eraseAt(sketch.strokes, 0.8, 0.62, 0.01).length, 1, 'Dots can be erased too');
  const frame = drawing.drawingFrame(sketch);
  assert.ok(frame.y > 0.1 && frame.y < 0.5 && frame.height <= 1.25, 'Previews crop to the band around the strokes');
  assert.deepEqual({ ...drawing.drawingFrame({ aspect: 1, strokes: [] }) }, { y: 0, height: 0.35 });
  const reminderTimes = load('components/notes/reminderTimes.ts', { '@/lib/date': load('lib/date.ts') });
  const at = (text) => new Date(text);
  const presets = (now) => Array.from(reminderTimes.reminderPresets(at(now)), (p) => `${p.label} ${p.at.getDate()} ${p.at.getHours()}`);
  assert.deepEqual(presets('2026-10-24T10:30:00'), ['Later today 24 13', 'Tomorrow 25 8', 'Next week 26 8'], 'Saturday morning: later today, tomorrow, Monday');
  assert.deepEqual(presets('2026-10-24T19:30:00'), ['Tomorrow 25 8', 'Next week 26 8'], 'No "later today" once the evening is under an hour away');
  assert.deepEqual(presets('2026-10-26T08:00:00').at(-1), 'Next week 2 8', 'On a Monday, next week is the Monday after');
  assert.equal(reminderTimes.formatReminder(at('2026-10-25T08:00:00').toISOString(), at('2026-10-24T10:00:00')), 'Tomorrow, 8:00');
  assert.equal(reminderTimes.formatReminder(at('2026-10-28T18:05:00').toISOString(), at('2026-10-24T10:00:00')), 'Wed, 28 Oct, 18:05');
  const { swipeDelta } = load('lib/swipe.ts');
  assert.equal(swipeDelta(-160, 0), 1, 'A long left swipe moves to the next section');
  assert.equal(swipeDelta(160, 0), -1, 'A long right swipe moves back a section');
  assert.equal(swipeDelta(30, 0), 0, 'Short, slow drags do nothing');
  assert.equal(swipeDelta(30, 900), 0, 'A quick short flick cannot accidentally switch tabs');
  assert.equal(swipeDelta(-100, -2000, 390), 0, 'Fast swipes still need deliberate distance');
  assert.equal(swipeDelta(-150, 0, 390), 1, 'Phone swipe threshold adapts to width');
  assert.equal(swipeDelta(-160, 0, 800), 0, 'Wide screens need the longer bounded threshold');
  assert.equal(swipeDelta(-30, 900), 0, 'A flick against the drag direction does nothing');
  process.env.TZ = 'Asia/Colombo';
  const date = load('lib/date.ts');
  const { todayLocalDate } = date;
  assert.equal(date.addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(date.weekOfMonthLabel('2026-03-02', '2026-10-24'), 'March 1st week');
  assert.equal(date.weekOfMonthLabel('2026-10-19', '2026-10-24'), 'October 4th week');
  assert.equal(date.weekOfMonthLabel('2026-09-28', '2026-10-24'), 'October 1st week', 'A week spanning months belongs to its Thursday');
  assert.equal(date.weekOfMonthLabel('2026-03-30', '2026-10-24'), 'April 1st week');
  assert.equal(date.weekOfMonthLabel('2026-08-31', '2026-10-24'), 'September 1st week');
  assert.equal(date.weekOfMonthLabel('2025-12-29', '2026-10-24'), 'January 1st week', 'The year follows the Thursday too');
  assert.equal(date.weekOfMonthLabel('2025-03-03', '2026-10-24'), 'March 1st week 2025', 'Other years are named');
  assert.equal(date.addDays('2026-03-29', 1), '2026-03-30', 'DST-safe day arithmetic');
  assert.equal(date.startOfWeek('2026-10-22'), '2026-10-19', 'Weeks start on Monday');
  assert.equal(date.weekdayIndex('2026-10-25'), 6);
  assert.equal(date.daysInMonth('2026-02-10'), 28);
  assert.equal(date.formatLongDate('2026-10-22'), 'Thursday, 22 October');
  assert.equal(date.formatDayHeading('2026-10-22', '2026-10-22'), 'Today, 22 Oct');
  assert.equal(date.formatDayHeading('2026-10-19', '2026-10-22'), 'Mon, 19 Oct');
  assert.equal(date.dateRange('2026-10-30', '2026-11-02').length, 4);
  assert.equal(date.addMonths('2026-01-31', 1), '2026-02-01');
  assert.equal(date.formatRelativeTimestamp('2026-10-25T12:00:00', new Date(2026, 9, 23)), '25 Oct');
  const heatmap = load('lib/heatmap.ts', { './date': date });
  assert.equal(heatmap.heatLevel(0), 0);
  assert.equal(heatmap.heatLevel(1), 4);
  assert.equal(heatmap.heatLevel(2), 4);
  assert.equal(heatmap.heatLevel(9), 4);
  assert.equal(heatmap.heatLevel(2, 8), 1);
  assert.equal(heatmap.heatLevel(8, 8), 4);
  assert.equal(heatmap.isActiveDay(31, '2026-10-23'), true);
  assert.equal(heatmap.isActiveDay(31, '2026-10-24'), false);
  assert.equal(todayLocalDate(new Date('2026-10-22T20:00:00Z')), '2026-10-23');
  assert.equal(todayLocalDate(new Date(2026, 0, 2)), '2026-01-02');
  console.log('Foundation verified: schema, seed persistence, foreign keys, cascades, local dates, and money.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
