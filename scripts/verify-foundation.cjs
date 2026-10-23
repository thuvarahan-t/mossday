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
  sqlite.exec('ALTER TABLE categories DROP COLUMN isUserCreated; ALTER TABLE categories DROP COLUMN archived;');
  sqlite.exec("UPDATE categories SET name='Snacks/Tea',icon='cafe-outline',color='#FEF3C7' WHERE name='Snacks'");
  sqlite.exec("UPDATE categories SET color='pink' WHERE name='Lunch'");
  await load('lib/db.ts', dependencies).getDatabase();
  assert.equal(sqlite.prepare('PRAGMA user_version').get().user_version, 4);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM categories WHERE isUserCreated=1').get().n, 0, 'Seed categories remain protected after upgrade');
  assert.equal(sqlite.prepare("SELECT icon FROM categories WHERE name='Snacks'").get().icon, 'coffee');
  assert.equal(sqlite.prepare("SELECT color FROM categories WHERE name='Lunch'").get().color, 'pink', 'Preserve edited seed colours');
  assert.equal(sqlite.prepare('SELECT amount FROM expenses').get().amount, 45000);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM categories').get().n, 10);
  assert.equal(sqlite.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='index' AND name LIKE '%_by_%'").get().n, 5);
  sqlite.exec("INSERT INTO categories(name,icon,color,type) VALUES ('My custom category','tag','green','OTHER')");
  sqlite.exec('ALTER TABLE categories DROP COLUMN isUserCreated; ALTER TABLE categories DROP COLUMN archived; PRAGMA user_version=3;');
  await load('lib/db.ts', dependencies).getDatabase();
  assert.equal(sqlite.prepare("SELECT isUserCreated FROM categories WHERE name='My custom category'").get().isUserCreated, 1,
    'Upgrade recognizes existing user-created categories');
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM categories WHERE id<=11 AND isUserCreated=1').get().n, 0);
  sqlite.close();

  const { formatMoney, parseAmountInput, applyKeypadKey, amountToInput } = load('lib/money.ts');
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
  assert.throws(() => formatMoney(1.5));
  process.env.TZ = 'Asia/Colombo';
  const date = load('lib/date.ts');
  const { todayLocalDate } = date;
  assert.equal(date.addDays('2026-10-31', 1), '2026-11-01');
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
  assert.equal(heatmap.heatLevel(2), 2);
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
