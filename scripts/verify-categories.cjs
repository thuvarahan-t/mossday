const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let gesture;
const exportsObject = {};
const jsx = (type, props) => ({ type, props });
const theme = { spacing: { sm: 8 }, radii: { lg: 12 }, colors: { card: 'white', accentFill: 'green' } };
const dependencies = {
  react: { useState: () => [320, () => {}], useRef: (value) => ({ current: value }) },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { View: 'View' },
  'react-native-gesture-handler': { GestureDetector: 'GestureDetector', usePanGesture: (config) => { gesture = config; return config; } },
  'react-native-reanimated': { default: { View: 'AnimatedView' }, LinearTransition: {}, useAnimatedStyle: (fn) => fn(), useReducedMotion: () => false,
    useSharedValue: (initial) => { let value = initial; return { get: () => value, set: (next) => { value = next; } }; } },
  'react-native-worklets': { scheduleOnRN: (fn, ...args) => fn(...args) },
  '@/hooks/useTheme': { useTheme: () => theme },
  '@/lib/haptics': { haptics: { selection: () => {} } },
  './IconTile': { IconTile: 'IconTile' }, './PressableScale': { PressableScale: 'PressableScale' }, './Text': { Text: 'Text' },
  './ContextMenu': { ContextMenu: 'ContextMenu' },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/ui/CategoryGrid.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports: exportsObject, require: (name) => { assert.ok(name in dependencies, name); return dependencies[name]; } });
const items = Array.from({ length: 8 }, (_, id) => ({ id, name: `Category ${id}`, icon: 'tag', color: 'green', isUserCreated: id === 0 ? 1 : 0 }));
let saved;
let selections = 0;
const dragging = [];
let managed;
const tree = exportsObject.CategoryGrid({ items, selected: 0, onSelect: () => { selections++; }, onCreate: () => {}, onReorder: (ids) => { saved = Array.from(ids); }, onDraggingChange: (active) => dragging.push(active), onDelete: (id) => { managed = id; } });
const tile = tree.props.children[0][0];
const rendered = tile.type(tile.props);
const button = rendered.props.children.props.children;
let menuOpened = 0;
button.props.ref.current = { open: () => { menuOpened++; } };
assert.equal(button.type, 'ContextMenu', 'Custom categories use the same popup as expense rows');
assert.equal(button.props.actions[0].label, 'Delete');
assert.equal(button.props.actions[0].destructive, true);
assert.equal(gesture.activateAfterLongPress, 350);
button.props.onPress();
assert.equal(selections, 1, 'A normal tap selects a category');
gesture.onActivate();
gesture.onUpdate({ translationX: 210, translationY: 100 });
gesture.onDeactivate({ translationX: 210, translationY: 100, canceled: false });
gesture.onFinalize();
assert.deepEqual(saved, [1, 2, 3, 4, 5, 0, 6, 7], 'Drag across columns and rows inserts at the drop position');
assert.deepEqual(dragging, [true, false], 'Scrolling resumes after a drag');
button.props.onPress();
assert.equal(selections, 1, 'Releasing a drag does not select or close the picker');
saved = null;
gesture.onActivate();
gesture.onDeactivate({ translationX: 210, translationY: 100, canceled: true });
gesture.onFinalize();
assert.equal(saved, null, 'Canceled gestures never persist an order');
button.props.triggerProps.onAccessibilityAction({ nativeEvent: { actionName: 'moveLater' } });
assert.deepEqual(saved, [1, 0, 2, 3, 4, 5, 6, 7], 'Assistive actions can also reorder');
saved = null;
gesture.onActivate();
gesture.onDeactivate({ translationX: 2, translationY: 3, canceled: false });
gesture.onFinalize();
assert.equal(menuOpened, 1, 'A stationary long press opens the contextual popup');
assert.equal(managed, undefined, 'Long press does not delete a category');
button.props.actions[0].onPress();
assert.equal(managed, 0, 'The popup Delete action removes the chosen category');
assert.equal(saved, null, 'Opening options does not reorder');
assert.equal(tree.props.children[0][1].props.onDelete, undefined, 'Built-in categories never offer deletion');
managed = undefined;
gesture.onActivate();
gesture.onDeactivate({ translationX: 0, translationY: 0, canceled: true });
gesture.onFinalize();
assert.equal(managed, undefined, 'Canceled holds never open deletion options');
assert.equal(menuOpened, 1, 'Canceled holds never open a popup');
console.log('Categories verified: tap, drag, cancellation, accessibility, custom long-press options, built-in protection.');
