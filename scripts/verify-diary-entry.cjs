const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: (name) => { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return exports;
}
const jsx = (type, props) => ({ type, props });
function hooks() {
  const slots = [];
  let index = 0;
  const react = {
    useRef: (initial) => { const position = index++; return slots[position] ??= { current: initial }; },
    useState: (initial) => { const position = index++; if (!(position in slots)) slots[position] = initial;
      return [slots[position], (next) => { slots[position] = typeof next === 'function' ? next(slots[position]) : next; }]; },
    useCallback: (fn) => fn,
  };
  return { react, reset: () => { index = 0; } };
}
const theme = { spacing: { xs: 4, sm: 8, md: 12, lg: 16 }, sizes: { rowPadding: 16, rowMinHeight: 52, checkbox: 24, touchTarget: 44 } };
const common = {
  'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { View: 'View' },
  '@/hooks/useTheme': { useTheme: () => theme }, '@/lib/haptics': { haptics: { success: () => {} } },
};
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
async function main() {
  const inputHooks = hooks();
  let cleanup;
  let closed = 0;
  const saved = [];
  let fail = false;
  let holdSave;
  const { InlineTodoEntry } = load('components/diary/InlineTodoEntry.tsx', {
    ...common, react: inputHooks.react, 'expo-router': { useFocusEffect: (fn) => { cleanup = fn(); } },
    '@/components/ui/Icon': { Icon: 'Icon' }, '@/components/ui/TextField': { TextField: 'TextField' },
    '@/hooks/useResource': { useAction: () => async (operation) => { try { await operation(); return true; } catch { return false; } } },
    '@/lib/repos/diary': { addTodo: async (...fields) => {
      if (fail) throw new Error('Storage failed');
      if (holdSave) await holdSave;
      saved.push(fields);
    } },
  });
  const renderInput = () => { inputHooks.reset(); return InlineTodoEntry({ date: '2026-11-06', onClose: () => { closed++; } }).props.children[1].props.children; };
  let field = renderInput();
  assert.equal(field.props.autoFocus, true, 'New inline row owns the typing cursor');
  assert.equal(field.props.submitBehavior, 'submit', 'Next keeps the keyboard open');
  field.props.onChangeText('Buy rice');
  field = renderInput();
  field.props.onSubmitEditing();
  await flush();
  assert.deepEqual(saved, [['2026-11-06', 'Buy rice', null]]);
  assert.equal(closed, 0, 'Submitting stays ready for another task');
  assert.equal(renderInput().props.value, '');
  field = renderInput(); field.props.onChangeText('Call home');
  field = renderInput(); field.props.onBlur(); await flush();
  assert.equal(saved.length, 2); assert.equal(closed, 1, 'Leaving the field saves it and closes the temporary row');
  field = renderInput(); field.props.onChangeText('   '); field.props.onBlur(); await flush();
  assert.equal(saved.length, 2, 'Blank rows never reach storage');
  field = renderInput(); field.props.onChangeText('Retry me'); fail = true;
  field = renderInput(); field.props.onSubmitEditing(); await flush();
  assert.equal(renderInput().props.value, 'Retry me', 'A save failure preserves the draft');
  fail = false; field = renderInput(); field.props.onSubmitEditing(); await flush();
  assert.equal(saved.at(-1)[1], 'Retry me');
  field = renderInput(); field.props.onChangeText('Before switching tabs');
  renderInput(); cleanup(); await flush();
  assert.equal(saved.at(-1)[1], 'Before switching tabs', 'Navigating away flushes typed content');
  assert.equal(renderInput().props.value, '', 'Returning cannot duplicate a saved draft');
  let release;
  holdSave = new Promise((resolve) => { release = resolve; });
  field = renderInput(); field.props.onChangeText('Only once');
  field = renderInput(); field.props.onSubmitEditing(); field.props.onBlur(); cleanup();
  release(); await flush(); holdSave = null;
  assert.equal(saved.filter((entry) => entry[1] === 'Only once').length, 1, 'Submit, blur and navigation cannot duplicate a pending save');

  const sheetHooks = hooks();
  const deleted = [];
  let undo;
  const todo = { id: 7, date: '2026-11-06', text: 'Buy milk', time: null, priority: 0, isDone: 0, sortOrder: 3 };
  const { TodoSheet } = load('components/diary/TodoSheet.tsx', {
    ...common, react: sheetHooks.react,
    '@/components/ui/Button': { Button: 'Button' }, '@/components/ui/FormSheet': { FormSheet: 'FormSheet' },
    '@/components/ui/DateSelector': { DateSelector: 'DateSelector' }, '@/components/ui/Text': { Text: 'Text' },
    '@/components/ui/TextField': { TextField: 'TextField' }, '@/components/ui/TimeField': { TimeField: 'TimeField' },
    '@/components/ui/Toggle': { Toggle: 'Toggle' }, '@/components/ui/Icon': { Icon: 'Icon' },
    '@/components/ui/PressableScale': { PressableScale: 'PressableScale' },
    '@/components/ui/Toast': { useToast: () => (toast) => { undo = toast.onAction; } },
    '@/hooks/useResource': { useAction: () => async (operation, onSuccess) => { await operation(); onSuccess?.(); return true; } },
    '@/lib/repos/diary': { deleteTodo: async (id) => { deleted.push(id); }, restoreTodo: async (item) => { deleted.push(`restored ${item.id}`); } },
  });
  const sheet = TodoSheet({ date: todo.date, initial: todo, onClose: () => {} });
  const controls = sheet.props.trailing.props.children;
  assert.equal(controls[0].props.accessibilityLabel, 'Delete to-do');
  assert.equal(controls[0].props.children.props.color, 'dangerText', 'Delete icon is red beside Save');
  controls[0].props.onPress(); await flush();
  assert.deepEqual(deleted, [7]); undo(); await flush();
  assert.deepEqual(deleted, [7, 'restored 7'], 'Sheet deletion can be undone');
  const listHooks = hooks();
  let selected;
  const { TodoList } = load('components/diary/TodoList.tsx', {
    ...common, react: { ...listHooks.react, useEffect: () => {} },
    '@/components/ui/Checkbox': { Checkbox: 'Checkbox' }, '@/components/ui/PressableScale': { PressableScale: 'PressableScale' },
    '@/components/ui/GroupedList': { GroupedList: 'GroupedList', ListRow: 'ListRow', Separator: 'Separator' },
    '@/components/ui/ReorderableStack': { ReorderableStack: 'ReorderableStack', ReorderHandle: 'ReorderHandle', useReorderActions: () => ({}) },
    '@/components/ui/StrikeText': { STRIKE_DURATION: 150, StrikeText: 'StrikeText' }, '@/components/ui/SwipeableRow': { SwipeableRow: 'SwipeableRow' },
    '@/components/ui/Text': { Text: 'Text' }, '@/components/ui/Toast': { useToast: () => () => {} },
    '@/hooks/useResource': { useAction: () => async (operation, success) => { await operation(); success?.(); return true; } },
    '@/hooks/useSheetState': { useSheetState: () => [selected, (value) => { selected = value; }, {}] },
    '@/lib/repos/diary': { deleteTodo: async (id) => { deleted.push(id); } },
    '@/lib/haptics': { haptics: { tap: () => {} } }, './TodoSheet': { TodoSheet: 'TodoSheet' },
    './todoOrder': { savedTodoOrder: () => [] }, './InlineTodoEntry': { InlineTodoEntry: 'InlineTodoEntry' },
  });
  const renderList = () => { listHooks.reset(); return TodoList({ todos: [todo], inlineDate: todo.date }); };
  let list = renderList();
  list.props.children[0].props.children[2].props.onPress();
  list = renderList();
  assert.equal(list.props.children[0].props.children[2].type, 'InlineTodoEntry', 'Add opens an inline row, not a sheet');
  const rowElement = list.props.children[0].props.children[1].props.renderItem(todo);
  const row = rowElement.type(rowElement.props);
  const handle = row.props.children[0].props.children[1];
  assert.equal(handle.props.children.type, 'PressableScale', 'To-do has a direct edit control without a context menu');
  handle.props.children.props.onPress();
  assert.equal(selected.id, todo.id, 'Tap immediately opens this task in the edit sheet');
  row.props.onDelete(); await flush();
  assert.equal(deleted.at(-1), todo.id, 'Swiping the diary row deletes the task');
  console.log('Diary entry verified: inline focus, consecutive entry, blur/navigation saves, empty drafts, failure retry, duplicate prevention and edit-sheet delete/undo.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
