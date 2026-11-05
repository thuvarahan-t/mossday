const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: (name) => { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return exports;
}
const jsx = (type, props) => ({ type, props });
const values = [];
const shared = (initial) => {
  let value = initial;
  const history = [];
  const result = { get: () => value, set: (next) => { value = next; history.push(next); }, history };
  values.push(result);
  return result;
};
let gesture;
let focus;
let animationDone;
let reduced = false;
const navigated = [];
const theme = { spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 }, sizes: { dayCircle: 40, touchTarget: 44, grabberWidth: 36, grabberHeight: 5, tabBarHeight: 62, screenInset: 16 },
  colors: { accent: 'green', tertiaryLabel: 'gray' }, shadows: { raised: 'shadow' }, radii: { pill: 999 } };
const native = { View: 'View', StyleSheet: { create: (styles) => styles, absoluteFill: {} }, useWindowDimensions: () => ({ width: 390 }) };
const motion = { durations: { fast: 150, normal: 250 }, easing: { standard: 'standard' }, spring: { bouncy: { damping: 12, stiffness: 260 } } };
const animated = {
  default: { View: 'AnimatedView' }, useSharedValue: shared, useReducedMotion: () => reduced,
  useAnimatedStyle: (fn) => ({ evaluate: fn }),
  withTiming: (value, _config, callback) => { if (callback) animationDone = callback; return value; },
  withSequence: (...steps) => steps.at(-1), Extrapolation: { CLAMP: 'clamp' },
  interpolate: (value, input, output) => output[0] + Math.max(0, Math.min(1, (value - input[0]) / (input[1] - input[0]))) * (output[1] - output[0]),
  ZoomIn: { springify: () => ({ damping: () => ({ stiffness: () => ({ delay: () => 'badge' }) }) }) },
};
const common = {
  react: { useCallback: (fn) => fn, useEffect: () => {}, useLayoutEffect: (fn) => fn(), useMemo: (fn) => fn(), useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
  'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native, 'react-native-reanimated': animated,
  'react-native-gesture-handler': { GestureDetector: 'GestureDetector', usePanGesture: (config) => { gesture = config; return config; } },
  'react-native-worklets': { scheduleOnRN: (fn, ...args) => fn(...args) },
  '@/constants/motion': motion, '@/hooks/useTheme': { useTheme: () => theme },
  '@/lib/animation': { animateTo: (value) => value }, '@/lib/haptics': { haptics: { selection: () => {} } },
};
const swipe = load('lib/swipe.ts');
const { TabSwipeArea } = load('components/navigation/TabSwipeArea.tsx', {
  ...common, 'expo-router': { router: { navigate: (href) => navigated.push(href) }, useFocusEffect: (fn) => { focus = fn; fn(); } },
  '@/lib/swipe': swipe, './tabs': { tabNeighbour: (_tab, delta) => delta === -1 ? '/diary' : undefined },
});
const tree = TabSwipeArea({ tab: 'notes', children: 'Notes' });
const pan = gesture;
pan.onUpdate({ translationX: 40 });
pan.onDeactivate({ translationX: 40, velocityX: 2000 });
assert.equal(navigated.length, 0, 'Fast short swipes do not navigate');
assert.equal(tree.props.children.props.style[1].evaluate().transform[0].translateX, 0, 'Rejected swipe springs back');
pan.onDeactivate({ translationX: 180, velocityX: 0, canceled: true });
assert.equal(navigated.length, 0, 'Canceled long swipes do not navigate');
pan.onDeactivate({ translationX: -180, velocityX: -1000 });
assert.equal(navigated.length, 0, 'Last tab cannot swipe past the end');
pan.onDeactivate({ translationX: 180, velocityX: 0 });
assert.equal(navigated.length, 0, 'Destination waits until slide-out completes');
assert.ok(tree.props.children.props.style[1].evaluate().transform[0].translateX > 0);
animationDone(true);
assert.deepEqual(navigated, ['/diary']);
pan.onDeactivate({ translationX: 180, velocityX: 0 });
assert.equal(navigated.length, 1, 'Repeated releases cannot navigate twice');
focus();
assert.equal(tree.props.children.props.style[1].evaluate().opacity, 1, 'Returning restores hidden source content');

const { TabSceneSlot } = load('components/navigation/TabSceneSlot.tsx', {
  ...common, 'expo-router/ui': { TabSlot: 'TabSlot' }, 'expo-router': { usePathname: () => '/diary' },
  'react-native-screens': { Screen: 'Screen' }, './tabs': { tabs: [{ href: '/diary' }, { href: '/notes' }] },
  './SceneMotion': { SceneMotionContext: { Provider: 'SceneMotionProvider' } },
});
const slot = TabSceneSlot();
const descriptor = { route: { key: 'diary' }, render: () => 'Diary content' };
assert.equal(slot.props.renderFn(descriptor, { loaded: false, isFocused: false }), null, 'Tabs remain lazy');
const scene = slot.props.renderFn(descriptor, { loaded: true, isFocused: true });
const transition = scene.props.children;
values.length = 0;
transition.type({ ...transition.props, direction: -1 });
const entering = transition.type({ ...transition.props, direction: -1 });
assert.equal(entering.type, 'SceneMotionProvider', 'The slot hands its motion to the screen instead of moving the whole scene');
assert.equal(entering.props.children.props.style.transform, undefined);
assert.ok(values[0].history[0] < 0, 'Previous tab enters from left');
reduced = true;
values.length = 0;
transition.type({ ...transition.props, direction: 1 });
assert.ok(values[0].history.every((value) => value === 0), 'Reduce Motion suppresses scene travel');
reduced = false;

let stateIndex = 0;
const dateValues = [260, false, 0, 350];
const { DiaryDateBar } = load('components/diary/DiaryDateBar.tsx', {
  ...common, react: { ...common.react, useState: () => [dateValues[stateIndex++], () => {}] },
  '@/components/ui/AnimatedEmoji': { AnimatedEmoji: 'AnimatedEmoji' }, '@/components/ui/DayStrip': { DayStrip: 'DayStrip' },
  '@/components/ui/Icon': { Icon: 'Icon' }, '@/components/ui/MonthGrid': { MonthGrid: 'MonthGrid' },
  '@/components/ui/PressableScale': { PressableScale: 'PressableScale' }, '@/components/ui/Text': { Text: 'Text' },
  '@/lib/date': { startOfMonth: (date) => `${date.slice(0, 7)}-01`, monthName: () => 'November', dayOfMonth: () => 6, addMonths: (date) => date },
  './JournalEditor': { MOODS: [] },
});
values.length = 0;
const dates = DiaryDateBar({ today: '2026-11-06', selected: '2026-11-06', month: '2026-11-01', markedDates: new Set(), moods: {}, monthlyTodos: [],
  onSelect: () => {}, onMonthChange: () => {}, onDraggingChange: () => {} });
const controls = dates.props.children.props.children;
assert.equal(controls[0].type, 'DayStrip', 'Week is outside the clipped month');
const monthStyle = controls[1].props.style[1];
assert.equal(monthStyle.evaluate().height, 0, 'Only month collapses');
controls[2].props.onPress();
assert.equal(monthStyle.evaluate().height, 260, 'Grabber expands the month');
dates.props.gesture.onActivate();
dates.props.gesture.onUpdate({ translationY: -1000 });
assert.equal(monthStyle.evaluate().height, 0, 'Upward overshoot never creates a negative height');
dates.props.gesture.onDeactivate({ canceled: true });
assert.equal(monthStyle.evaluate().height, 260, 'Interrupted fold restores its starting expansion');
assert.equal(controls[0].type, 'DayStrip', 'Week remains present across collapse and cancellation');

let adds = 0;
const { FloatingAddButton } = load('components/navigation/FloatingAddButton.tsx', {
  'react/jsx-runtime': { jsx }, '@/hooks/useTheme': common['@/hooks/useTheme'],
  '@/hooks/useTabBarInset': { useTabBarBottom: () => 24 }, '@/components/ui/Icon': { Icon: 'Icon' },
  '@/components/ui/PressableScale': { PressableScale: 'PressableScale' },
});
const add = FloatingAddButton({ label: 'New note', onPress: () => { adds++; } });
assert.ok(add.props.style.bottom > 24 + theme.sizes.tabBarHeight, 'Add button clears the tab bar');
assert.equal(add.props.style.backgroundColor, 'green');
add.props.onPress(); assert.equal(adds, 1);
const dateLib = load('lib/date.ts');
let stripTap;
let stripState = 0;
const picked = [];
const { DayStrip } = load('components/ui/DayStrip.tsx', {
  ...common, react: { ...common.react, memo: (component) => component, useMemo: (fn) => fn(), useState: () => [stripState++ === 0 ? 490 : 0, () => {}] },
  'react-native-reanimated': { ...animated, useAnimatedScrollHandler: () => () => {} },
  'react-native-gesture-handler': { GestureDetector: 'GestureDetector', useTapGesture: (config) => { stripTap = config; return config; } },
  '@/lib/date': dateLib, './PressableScale': { PressableScale: 'PressableScale' }, './Text': { Text: 'Text' },
});
values.length = 0;
const stripToday = '2026-11-06';
DayStrip({ today: stripToday, selected: stripToday, onSelect: (date) => picked.push(date) });
values[0].set(70 * 700);
stripTap.onActivate({ x: 75 });
assert.deepEqual(picked, [dateLib.addDays(stripToday, -730 + 701)], 'A tap selects the day under the finger at the current scroll position');
stripTap.onActivate({ x: 75 });
assert.equal(picked.length, 1, 'A tap and a press on the same day select it once');

const stubbedModules = (overrides) => new Proxy(overrides, {
  has: () => true,
  get: (target, name) => name in target ? target[name] : new Proxy({}, { get: (_module, exportName) => exportName }),
});
const keyedJsx = (type, props, key) => ({ type, props, key });
const { DiaryScreen } = load('components/diary/DiaryScreen.tsx', stubbedModules({
  react: { useCallback: (fn) => fn, useState: (value) => [value, () => {}] },
  'react/jsx-runtime': { jsx: keyedJsx, jsxs: keyedJsx },
  '@/hooks/useTheme': common['@/hooks/useTheme'], '@/hooks/useCurrency': { useCurrency: () => {} },
  '@/hooks/useToday': { useToday: () => '2026-11-07' }, '@/lib/date': dateLib, '@/lib/money': { formatMoney: () => '0' },
  '@/components/share/ShareImage': { useShareImage: () => () => {} },
  '@/hooks/useResource': { useAction: () => () => {}, useResource: () => ({ error: null, refresh: () => {}, data: {
    date: '2026-11-06', todos: [], previous: [], journal: { text: 'Yesterday' }, expenses: [], habits: [], logs: [], monthlyTodos: [], moods: {}, nearbyTodos: [],
  } }) },
}));
const findByType = (node, type) => {
  if (Array.isArray(node)) return node.map((child) => findByType(child, type)).find(Boolean);
  if (!node || typeof node !== 'object') return undefined;
  return node.type === type ? node : findByType(node.props?.children, type);
};
const diary = DiaryScreen();
assert.equal(diary.props.title.startsWith('7 '), true, 'The title follows the tapped day at once');
const journal = findByType(diary, 'JournalEditor');
assert.equal(journal.key, '2026-11-06', 'The journal only remounts once the tapped day has loaded');
assert.equal(journal.props.date, '2026-11-06', 'A journal is saved to the day its text was loaded from');
assert.equal(findByType(diary, 'TodoList').props.inlineDate, '2026-11-06');
const { LargeTitleScreen } = load('components/ui/LargeTitleScreen.tsx', stubbedModules({
  react: { useEffect: () => {}, useState: (value) => [value, () => {}] }, 'react/jsx-runtime': { jsx: keyedJsx, jsxs: keyedJsx }, 'react-native': native,
  'react-native-reanimated': { ...animated, default: { View: 'AnimatedView', ScrollView: 'AnimatedScrollView' }, useAnimatedRef: () => ({}), useAnimatedScrollHandler: () => () => {}, useAnimatedKeyboard: () => ({ height: shared(0) }) },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }, '@/hooks/useTheme': common['@/hooks/useTheme'],
  '@/hooks/useTabBarInset': { useTabBarInset: () => 0 }, '@/hooks/useWindowTopOffset': { useWindowTopOffset: () => 0 },
  '@/components/navigation/SceneMotion': { useSceneMotionStyles: () => ({ content: 'scene-content', fade: 'scene-fade' }) },
  'expo-router': { router: { back: () => {} } },
}));
const movedBy = (node, type, moving = []) => {
  if (Array.isArray(node)) return node.map((child) => movedBy(child, type, moving)).find(Boolean);
  if (!node || typeof node !== 'object') return undefined;
  if (node.type === type) return { moving };
  const style = [node.props?.style].flat();
  return movedBy(node.props?.children, type, [...moving, ...style.filter((item) => item === 'scene-content' || item === 'scene-fade')]);
};
const page = LargeTitleScreen({ title: 'Diary', floatingAdd: { label: 'Add', onPress: () => {} }, titleAccessory: { type: 'TabHeaderActions', props: {} },
  fixedContent: { type: 'DateBar', props: {} }, children: { type: 'PageContent', props: {} } });
assert.deepEqual(movedBy(page, 'TabHeaderActions').moving, [], 'Share and settings stay still across tab switches');
assert.deepEqual(movedBy(page, 'FloatingAddButton').moving, [], 'The floating add button stays still across tab switches');
assert.deepEqual(movedBy(page, 'PageContent').moving, ['scene-content'], 'The page content carries the tab switch');
assert.deepEqual(movedBy(page, 'DateBar').moving, ['scene-content'], 'Fixed page controls travel with their page');
assert.deepEqual(movedBy(page, 'Text').moving, ['scene-fade'], 'The title fades in place');
console.log('Navigation verified: deliberate swipes, cancellation, exit/entry motion, reduced motion, permanent week row, month folding, floating add placement, fixed tab actions, day taps and per-day diary content.');
