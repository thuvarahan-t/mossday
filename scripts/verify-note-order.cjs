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
const listOrder = load('components/ui/listOrder.ts', {});
const masonry = load('components/ui/masonryOrder.ts', { './listOrder': listOrder });
const ids = [1, 2, 3, 4, 5, 6];
const heights = { 1: 120, 2: 200, 3: 80, 4: 160, 5: 100, 6: 90 };
for (const id of ids) {
  const targets = masonry.masonryTargets(ids, heights, 150, 12, id);
  targets.forEach((slot, index) => {
    assert.equal(masonry.masonryDropIndex(targets, slot.x, slot.y, index), index, 'Stable insertion target');
    const moved = listOrder.moveItem(ids, id, index);
    const layout = masonry.masonryLayout(moved, heights, 150, 12);
    for (const a of ids) for (const b of ids) {
      if (a === b || layout.slots[a].x !== layout.slots[b].x) continue;
      assert.ok(layout.slots[a].y + heights[a] <= layout.slots[b].y || layout.slots[b].y + heights[b] <= layout.slots[a].y,
        'Unequal-height cards never overlap');
    }
  });
}
assert.deepEqual(ids, [1, 2, 3, 4, 5, 6], 'Preview never mutates source order');

const shared = (initial) => { let value = initial; return { get: () => value, set: (next) => { value = next; } }; };
const scroll = { ref: {}, offset: shared(0), top: shared(60), bottom: shared(500), max: shared(1000) };
let gesture;
let frame;
let stateIndex = 0;
let reduced = false;
const jsx = (type, props) => ({ type, props });
const dragChanges = [];
const dependencies = {
  react: { useContext: () => scroll, useEffect: () => {}, useLayoutEffect: (fn) => fn(), useMemo: (fn) => fn(),
    useRef: (value) => ({ current: value }), useState: () => [[360, {}, false][stateIndex++], () => {}] },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { View: 'View', StyleSheet: { create: (styles) => styles } },
  'react-native-gesture-handler': { GestureDetector: 'GestureDetector', usePanGesture: (value) => { gesture = value; return value; } },
  'react-native-reanimated': { default: { View: 'AnimatedView' }, useSharedValue: shared, useReducedMotion: () => reduced,
    useAnimatedStyle: (fn) => ({ evaluate: fn }), useDerivedValue: (fn) => ({ get: fn }),
    useFrameCallback: (fn) => { frame = fn; }, scrollTo: () => {} },
  'react-native-worklets': { scheduleOnRN: (fn, ...args) => fn(...args) },
  '@/hooks/useTheme': { useTheme: () => ({ spacing: { md: 12 }, sizes: { screenInset: 24 }, radii: { card: 16 },
    colors: { accent: 'green', accentFill: 'white' }, shadows: { raised: 'shadow' } }) },
  '@/lib/animation': { animateTo: (value) => value }, '@/lib/haptics': { haptics: { selection: () => {} } },
  './ContextMenu': { ContextMenu: 'ContextMenu' }, './DragScrollContext': { DragScrollContext: {} },
  './listOrder': listOrder, './masonryOrder': masonry,
};
const { ReorderableMasonryGrid } = load('components/ui/ReorderableMasonryGrid.tsx', dependencies);
async function main() {
  let saved;
  let saveResult = true;
  let opens = 0;
  const tree = ReorderableMasonryGrid({ items: ids.map((id) => ({ id })), estimateHeight: (item) => heights[item.id],
    renderItem: () => 'Card', label: (item) => `Note ${item.id}`, actions: () => [], onPress: () => { opens++; },
    onReorder: async (next) => { saved = Array.from(next); return saveResult; }, onDraggingChange: (active) => dragChanges.push(active) });
  const cells = tree.props.children.props.children[1];
  const row = cells[0].type(cells[0].props);
  const first = gesture;
  const control = row.props.children.props.children;
  let menus = 0;
  control.props.ref.current = { open: () => { menus++; } };
  const drag = cells[0].props.drag;
  const peer = cells[1].type(cells[1].props);
  const peerStyle = peer.props.children.props.style.at(-1);
  const before = peerStyle.evaluate().transform;
  assert.equal(first.activateAfterLongPress, 350);
  control.props.onPress(); assert.equal(opens, 1);
  first.onActivate({ absoluteY: 180 });
  first.onUpdate({ translationX: 162, translationY: 212, absoluteY: 390 });
  assert.notDeepEqual(Array.from(drag.order.get()), ids, 'Neighbours reorder before drop');
  assert.notDeepEqual(peerStyle.evaluate().transform, before, 'Neighbour position animates into the open space');
  assert.equal(saved, undefined, 'Hover does not persist');
  const preview = Array.from(drag.order.get());
  first.onDeactivate({ canceled: false }); first.onFinalize({ canceled: false });
  await Promise.resolve();
  assert.deepEqual(saved, preview, 'Release persists the preview');
  control.props.onPress(); assert.equal(opens, 1, 'Release cannot accidentally open the note');
  assert.deepEqual(dragChanges, [true, false]);
  drag.order.set(ids.slice());
  first.onActivate({ absoluteY: 180 });
  first.onDeactivate({ canceled: false }); first.onFinalize({ canceled: false });
  assert.equal(menus, 1, 'Hold without moving retains the context menu');
  first.onActivate({ absoluteY: 180 });
  first.onUpdate({ translationX: 162, translationY: 212, absoluteY: 490 });
  frame({ timeSincePreviousFrame: 16 });
  assert.ok(scroll.offset.get() > 0, 'Holding near bottom auto-scrolls');
  first.onDeactivate({ canceled: true }); first.onFinalize({ canceled: true });
  assert.deepEqual(Array.from(drag.order.get()), ids, 'Interrupted drag restores original order');
  assert.equal(drag.activeId.get(), null);
  saveResult = false;
  first.onActivate({ absoluteY: 180 });
  first.onUpdate({ translationX: 162, translationY: 212, absoluteY: 390 });
  first.onDeactivate({ canceled: false }); first.onFinalize({ canceled: false });
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(Array.from(drag.order.get()), ids, 'Save failures restore repository order');
  reduced = true;
  const reducedRow = cells[0].type({ ...cells[0].props, reduced: true });
  gesture.onActivate({ absoluteY: 180 });
  assert.equal(reducedRow.props.children.props.style.at(-1).evaluate().transform[2].scale, 1, 'Reduce Motion disables lifting scale');
  gesture.onFinalize({ canceled: true });
  console.log('Note reorder verified: unequal heights, live previews, drop, hold menu, cancellation, rollback, auto-scroll and reduced motion.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
