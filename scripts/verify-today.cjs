const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

let now = new Date(2026, 9, 23, 23, 59, 59).getTime();
class Clock extends Date {
  constructor(...args) { super(...(args.length ? args : [now])); }
}
let value;
let cleanup;
let listener;
let removed = false;
let nextTimer = 0;
const timers = new Map();
const exportsObject = {};
const dependencies = {
  react: {
    useState: (initial) => { value = initial(); return [value, (next) => { value = next; }]; },
    useEffect: (effect) => { cleanup = effect(); },
  },
  'react-native': { AppState: { addEventListener: (event, callback) => {
    assert.equal(event, 'change');
    listener = callback;
    return { remove: () => { removed = true; } };
  } } },
  '@/lib/date': { todayLocalDate: (date = new Clock()) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('hooks/useToday.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, {
  exports: exportsObject, Date: Clock,
  require: (name) => { assert.ok(name in dependencies); return dependencies[name]; },
  setTimeout: (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
  clearTimeout: (id) => timers.delete(id),
});
exportsObject.useToday();
assert.equal(value, '2026-10-23');
assert.equal([...timers.values()][0].delay, 1000);
now += 1000;
[...timers.values()][0].callback();
assert.equal(value, '2026-10-24', 'An open dashboard rolls over at local midnight');
assert.equal(timers.size, 1, 'Only one midnight timer remains');
now = new Date(2026, 9, 26, 8).getTime();
listener('background');
assert.equal(value, '2026-10-24');
listener('active');
assert.equal(value, '2026-10-26', 'Foreground refresh catches suspended days');
assert.equal(timers.size, 1);
cleanup();
assert.equal(timers.size, 0);
assert.equal(removed, true);
console.log('Today verified: local midnight rollover, foreground refresh, timer and listener cleanup.');
