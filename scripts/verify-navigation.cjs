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
  react: { useCallback: (fn) => fn, useEffect: () => {}, useLayoutEffect: (fn) => fn(), useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
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
});
const slot = TabSceneSlot();
const descriptor = { route: { key: 'diary' }, render: () => 'Diary content' };
assert.equal(slot.props.renderFn(descriptor, { loaded: false, isFocused: false }), null, 'Tabs remain lazy');
const scene = slot.props.renderFn(descriptor, { loaded: true, isFocused: true });
const transition = scene.props.children;
values.length = 0;
transition.type({ ...transition.props, direction: -1 });
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
console.log('Navigation verified: deliberate swipes, cancellation, exit/entry motion, reduced motion, permanent week row, month folding and floating add placement.');
