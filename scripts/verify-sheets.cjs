const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

let state;
const exported = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('hooks/useSheetState.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, {
  exports: exported,
  require: (name) => {
    assert.equal(name, 'react');
    return {
      useCallback: (callback) => callback,
      useState: (initial) => {
        state ??= initial;
        return [state, (update) => { state = update(state); }];
      },
    };
  },
});
const render = (sequence = false) => exported.useSheetState(sequence);
let [, select] = render();
select('expense');
select(null);
assert.equal(render()[0], 'expense', 'Closing retains the mounted form for its exit animation');
assert.equal(render()[2].visible, false);
render()[2].onDismissed();
assert.equal(render()[0], null);
select({ time: '09:00' });
select({ time: '10:30' });
assert.equal(render()[2].visible, true, 'Editing form data must not dismiss it');
assert.equal(render()[0].time, '10:30');
render()[2].onDismissed();
assert.equal(render()[0].time, '10:30', 'Ignore a stale dismissal after reopening');
state = undefined;
[, select] = render(true);
select('quick');
select('expense');
assert.equal(render(true)[0], 'quick', 'Replacement waits for the outgoing sheet');
assert.equal(render(true)[2].visible, false);
render(true)[2].onDismissed();
assert.equal(render(true)[0], 'expense');
assert.equal(render(true)[2].visible, true);
select('todo');
select(null);
render(true)[2].onDismissed();
assert.equal(render(true)[0], null, 'Cancel also cancels a queued replacement');
console.log('Sheets verified: deferred unmount, sequential replacement, draft updates, stale dismissal and cancellation.');
