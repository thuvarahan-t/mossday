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
  sqlite.exec("DELETE FROM categories WHERE name='Entertainment'");
  await load('lib/db.ts', dependencies).getDatabase();
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM categories').get().n, 10, 'Restart must not reseed deleted categories');
  sqlite.close();

  const { formatMoney } = load('lib/money.ts');
  assert.equal(formatMoney(125000), 'Rs. 1,250');
  assert.equal(formatMoney(125050), 'Rs. 1,250.5');
  assert.equal(formatMoney(0), 'Rs. 0');
  assert.equal(formatMoney(-125000), 'Rs. -1,250');
  assert.throws(() => formatMoney(1.5));
  process.env.TZ = 'Asia/Colombo';
  const { todayLocalDate } = load('lib/date.ts');
  assert.equal(todayLocalDate(new Date('2026-10-22T20:00:00Z')), '2026-10-23');
  assert.equal(todayLocalDate(new Date(2026, 0, 2)), '2026-01-02');
  console.log('Foundation verified: schema, seed persistence, foreign keys, cascades, local dates, and money.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
