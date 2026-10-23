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
const ordering = load('components/ui/categoryGridOrder.ts', {});
const listOrder = load('components/ui/listOrder.ts', {});
const original = Array.from({ length: 8 }, (_, index) => index);
for (const id of original) for (const target of original) {
  const reordered = Array.from(listOrder.moveItem(original, id, target));
  assert.equal(reordered[target], id);
  assert.equal(new Set(reordered).size, 8);
  assert.deepEqual(reordered.filter((value) => value !== id), original.filter((value) => value !== id), 'Other categories preserve relative order');
}
assert.deepEqual(original, Array.from({ length: 8 }, (_, index) => index), 'Previews never mutate their input');
assert.equal(ordering.categoryDropIndex(0, 9999, 9999, 100, 100, 8), 7, 'Incomplete final rows exclude New');
assert.equal(ordering.categoryDropIndex(7, -9999, -9999, 100, 100, 8), 0, 'Off-grid drops clamp safely');
let gesture;
let reduced = false;
const jsx = (type, props) => ({ type, props });
const theme = { spacing: { sm: 8 }, sizes: { iconTile: 40 }, shadows: { raised: 'shadow' }, radii: { lg: 12 }, colors: { card: 'white', accentFill: 'green', accent: 'green' } };
const dependencies = {
  react: { useEffect: () => {}, useState: () => [320, () => {}], useRef: (value) => ({ current: value }) },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { View: 'View', StyleSheet: { create: (styles) => styles }, useWindowDimensions: () => ({ fontScale: 1 }) },
  'react-native-gesture-handler': { GestureDetector: 'GestureDetector', usePanGesture: (config) => { gesture = config; return config; } },
  'react-native-reanimated': { default: { View: 'AnimatedView' }, useAnimatedStyle: (fn) => ({ evaluate: fn }), useReducedMotion: () => reduced,
    useSharedValue: (initial) => { let value = initial; return { get: () => value, set: (next) => { value = next; } }; } },
  'react-native-worklets': { scheduleOnRN: (fn, ...args) => fn(...args) },
  '@/hooks/useTheme': { useTheme: () => theme },
  '@/constants/typography': { textVariants: { footnote: { lineHeight: 18 } } },
  '@/lib/animation': { animateTo: (value) => value },
  '@/lib/haptics': { haptics: { selection: () => {} } },
  './categoryGridOrder': ordering, './listOrder': listOrder,
  './IconTile': { IconTile: 'IconTile' }, './PressableScale': { PressableScale: 'PressableScale' }, './Text': { Text: 'Text' },
  './ContextMenu': { ContextMenu: 'ContextMenu' },
};
const { CategoryGrid } = load('components/ui/CategoryGrid.tsx', dependencies);
const items = original.map((id) => ({ id, name: `Category ${id}`, icon: 'tag', color: 'green', isUserCreated: id === 0 ? 1 : 0 }));
let saved;
let selections = 0;
const dragging = [];
let deleted;
let edited;
const tree = CategoryGrid({ items, selected: 0, onSelect: () => { selections++; }, onCreate: () => {}, onReorder: (ids) => { saved = Array.from(ids); }, onDraggingChange: (active) => dragging.push(active), onDelete: (id) => { deleted = id; }, onEdit: (id) => { edited = id; } });
const tiles = tree.props.children[1];
const tile = tiles[0];
const shared = tile.props.drag;
const rendered = tile.type(tile.props);
const firstGesture = gesture;
const button = rendered.props.children.props.children;
let menuOpened = 0;
button.props.ref.current = { open: () => { menuOpened++; } };
assert.equal(button.type, 'ContextMenu');
assert.deepEqual(Array.from(button.props.actions, (action) => action.label), ['Edit', 'Delete']);
assert.equal(button.props.actions[1].destructive, true);
assert.equal(firstGesture.activateAfterLongPress, 350);
button.props.onPress();
assert.equal(selections, 1, 'A normal tap selects a category');
const peer = tiles[1].type(tiles[1].props);
const peerStyle = peer.props.children.props.style.at(-1);
assert.ok(peerStyle.evaluate().transform[0].translateX > 0);
firstGesture.onActivate();
firstGesture.onUpdate({ translationX: 210, translationY: 108 });
const competingGesture = gesture;
competingGesture.onActivate();
competingGesture.onDeactivate({ canceled: true });
competingGesture.onFinalize({ canceled: true });
assert.equal(shared.activeId.get(), 0, 'Another touch cannot take over an active drag');
assert.deepEqual(Array.from(shared.order.get()), [1, 2, 3, 4, 5, 0, 6, 7], 'Neighbors reorder during the drag');
assert.equal(saved, undefined, 'Hover previews do not write to storage');
assert.equal(peerStyle.evaluate().transform[0].translateX, 0, 'Neighbor moves into the open first slot before drop');
const activeStyle = rendered.props.children.props.style.at(-1).evaluate();
assert.equal(activeStyle.transform[0].translateX, 210, 'Dragged tile follows the finger');
assert.equal(activeStyle.transform[2].scale, 1.04);
assert.equal(tree.props.children[0].props.style.at(-1).evaluate().opacity, 1, 'Drop placeholder is visible');
firstGesture.onDeactivate({ canceled: false });
firstGesture.onFinalize({ canceled: false });
assert.deepEqual(saved, [1, 2, 3, 4, 5, 0, 6, 7]);
assert.deepEqual(dragging, [true, false]);
assert.equal(tree.props.children[0].props.style.at(-1).evaluate().opacity, 0);
button.props.onPress();
assert.equal(selections, 1, 'Dropping does not select or close the picker');
function reset() { saved = null; shared.order.set(original.slice()); shared.activeId.set(null); }
reset();
firstGesture.onActivate();
firstGesture.onUpdate({ translationX: 220, translationY: 108 });
firstGesture.onDeactivate({ canceled: true });
firstGesture.onFinalize({ canceled: true });
assert.equal(saved, null);
assert.deepEqual(Array.from(shared.order.get()), original, 'Cancel restores the complete starting order');
assert.equal(menuOpened, 0);
reset();
const reverse = tiles[5].type(tiles[5].props);
const reverseGesture = gesture;
reverseGesture.onActivate();
reverseGesture.onUpdate({ translationX: -220, translationY: -108 });
assert.deepEqual(Array.from(shared.order.get()), [5, 0, 1, 2, 3, 4, 6, 7], 'Dragging backwards previews all displaced tiles');
reverseGesture.onDeactivate({ canceled: false });
reverseGesture.onFinalize({ canceled: false });
assert.deepEqual(saved, [5, 0, 1, 2, 3, 4, 6, 7]);
assert.ok(reverse.props.children.props.style.at(-1).evaluate().transform[0].translateX === 0);
reset();
button.props.triggerProps.onAccessibilityAction({ nativeEvent: { actionName: 'moveLater' } });
assert.deepEqual(saved, [1, 0, 2, 3, 4, 5, 6, 7]);
reset();
firstGesture.onActivate();
firstGesture.onDeactivate({ canceled: false });
firstGesture.onFinalize({ canceled: false });
assert.equal(menuOpened, 1);
assert.equal(deleted, undefined);
assert.equal(saved, null);
button.props.actions[0].onPress();
assert.equal(edited, 0, 'Edit targets the correct category');
button.props.actions[1].onPress();
assert.equal(deleted, 0);
const builtInButton = peer.props.children.props.children;
assert.deepEqual(Array.from(builtInButton.props.actions, (action) => action.label), ['Edit'], 'Built-ins can be edited but never deleted');
reset();
firstGesture.onActivate();
firstGesture.onUpdate({ translationX: 210, translationY: 108 });
firstGesture.onUpdate({ translationX: 0, translationY: 0 });
firstGesture.onDeactivate({ canceled: false });
firstGesture.onFinalize({ canceled: false });
assert.equal(saved, null, 'Returning to the start does not save an unchanged order');
assert.equal(menuOpened, 1, 'A moved tile never opens the popup on release');
reduced = true;
const reducedTile = tiles[0].type(tiles[0].props);
assert.equal(reducedTile.props.children.props.style.at(-1).evaluate().transform[2].scale, 1, 'Reduced motion disables lift scaling');
console.log('Categories verified: live neighbor previews, forward/backward drops, placeholder, cancellation, unchanged drops, edit/delete, accessibility, reduced motion.');
