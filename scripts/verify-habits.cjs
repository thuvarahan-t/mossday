const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, Date, Intl, require: (name) => { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return exports;
}
const date = load('lib/date.ts');
const periods = load('components/habits/habitPeriod.ts', { '@/lib/date': date });
const heatmap = load('lib/heatmap.ts', { './date': date });
const february = Array.from(periods.habitMonthRows('2024-02-20').flat()).filter(Boolean);
assert.equal(february.length, 29);
assert.equal(february.at(-1), '2024-02-29');
assert.equal(periods.habitMonthRows('2024-02-20')[0][0], null, 'The month aligns to Monday');
assert.equal(periods.habitPeriod('Year', '2012-06-01').weeks, 54, 'A Sunday-starting leap year needs 54 calendar columns');
assert.equal(periods.habitPeriod('Year', '2026-10-24').start, '2026-01-01');
assert.equal(periods.habitPeriod('Year', '2026-10-24').end, '2026-12-31');
assert.equal(periods.safeHabitDate('2026-02-30', '2026-10-24'), '2026-10-24');
assert.equal(periods.safeHabitDate('2026-10-25', '2026-10-24'), '2026-10-24');
assert.equal(periods.safeHabitDate('2026-10-20', '2026-10-24'), '2026-10-20');
assert.equal(periods.safeHabitDate(['2026-10-20'], '2026-10-24'), '2026-10-24');
assert.deepEqual([0, 1, 2, 3].map((count) => heatmap.heatLevel(count, 3)), [0, 2, 3, 4]);
const theme = {
  colors: { card: '#FFFFFF', label: '#000000', fill: '#EEEEEE', accent: '#217C46' }, accents: { purple: '#AF52DE', yellow: '#FFCC00' },
  spacing: { xxs: 2, xs: 4, sm: 8 }, sizes: { touchTarget: 44, habitRing: 64, tickButton: 40, heatmapSquare: 10 }, radii: { lg: 14, sm: 8 },
};
const colors = load('lib/dataColors.ts', { '@/constants/theme': { resolveAccent: (current, color) => current.accents[color] ?? color } });
const palette = colors.dataColors(theme, 'purple');
assert.equal(palette.accent, '#AF52DE');
assert.equal(palette.heatmap[4], palette.accent);
assert.notEqual(palette.surface, theme.colors.card);
assert.equal(colors.dataColors(theme, '#112233').accent, '#112233');
assert.equal(colors.dataColors(theme, 'invalid').accent, theme.colors.accent);
assert.equal(colors.dataColors(theme, 'yellow').onAccent, '#000000', 'Bright habit fills have legible check marks');
assert.equal(colors.dataColors({ ...theme, colors: { ...theme.colors, card: '#1C1C1E' } }, 'purple').heatmap[4], palette.accent);
const jsx = (type, props) => ({ type, props });
const common = {
  react: { memo: (component) => component, useEffect: () => {}, useMemo: (fn) => fn(), useRef: (value) => ({ current: value }) },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { View: 'View', ScrollView: 'ScrollView' },
  'react-native-reanimated': { default: { View: 'AnimatedView' }, useAnimatedStyle: (fn) => fn(), useReducedMotion: () => true,
    useSharedValue: (initial) => { let value = initial; return { get: () => value, set: (next) => { value = next; } }; } },
  '@/hooks/useTheme': { useTheme: () => theme }, '@/lib/dataColors': colors,
  '@/lib/animation': { animateTo: (value) => value }, '@/constants/motion': { scales: { pop: 1.15 } },
  '@/components/ui/Icon': { Icon: 'Icon' }, '@/components/ui/PressableScale': { PressableScale: 'PressableScale' },
  '@/components/ui/ProgressRing': { ProgressRing: 'ProgressRing' }, '@/components/ui/Text': { Text: 'Text' },
};
const { HabitTickButton } = load('components/habits/HabitTickButton.tsx', common);
for (let count = 0; count <= 3; count++) {
  let added = 0;
  let removed = 0;
  const control = HabitTickButton({ name: 'Water', count, goal: 3, color: 'purple', onTick: () => added++, onUndo: () => removed++ });
  const main = control.props.children[0];
  const undo = control.props.children[1].props.children[1];
  if (count < 3) assert.equal(main.props.children.props.children.props.color, palette.accent, 'Progress rings use the habit color');
  assert.equal(undo.props.disabled, count === 0);
  assert.equal(control.props.children[1].props.children[0].props.children.join(''), `${count}/3`);
  main.props.onPressIn(); main.props.onPress();
  assert.equal(added, count < 3 ? 1 : 0);
  assert.equal(removed, count === 3 ? 1 : 0, 'A completed check toggles back by one');
  if (count) {
    main.props.onPressIn(); main.props.onLongPress(); main.props.onPress();
    assert.equal(removed, count === 3 ? 2 : 1, 'A hold removes exactly one tick, including release');
    undo.props.onPress();
    assert.equal(removed, count === 3 ? 3 : 2, 'The visible Undo action also works');
  }
}
const { HabitTracker } = load('components/habits/HabitTracker.tsx', {
  ...common, '@/components/ui/Heatmap': { Heatmap: 'Heatmap', HeatmapWeekdayLabels: 'WeekdayLabels' },
  '@/lib/date': date, '@/lib/heatmap': heatmap, './habitPeriod': periods,
});
const habit = { id: 1, name: 'Water', color: 'purple', dailyGoal: 3, activeDays: 127 };
let picked;
const month = HabitTracker({ habit, counts: { '2026-10-24': 3 }, mode: 'Month', anchor: '2026-10-24', today: '2026-10-24', onSelectDate: (day) => { picked = day; } });
const cells = month.props.children[1].flatMap((row) => row.props.children).filter((cell) => cell.props.children);
const todayCell = cells.find((cell) => cell.props.children.props.accessibilityLabel.startsWith('Saturday, 24 October'));
const futureCell = cells.find((cell) => cell.props.children.props.accessibilityLabel.startsWith('Sunday, 25 October'));
assert.equal(futureCell.props.children.props.disabled, true);
todayCell.props.children.props.onPress();
assert.equal(picked, '2026-10-24');
assert.equal(todayCell.props.children.props.children.props.style.backgroundColor, palette.accent);
const year = HabitTracker({ habit, counts: {}, mode: 'Year', anchor: '2026-10-24', today: '2026-10-24', fitWidth: 300 });
assert.equal(year.type, 'Heatmap');
assert.equal(year.props.minDate, '2026-01-01');
assert.equal(year.props.maxDate, '2026-12-31');
assert.equal(year.props.color, 'purple');
const { Heatmap } = load('components/ui/Heatmap.tsx', {
  ...common,
  'react-native': { View: 'View', Pressable: 'Pressable', StyleSheet: { create: (styles) => styles } },
  'react-native-svg': { default: 'Svg', Rect: 'Rect' }, './Text': { Text: 'Text' },
  '@/lib/date': date, '@/lib/heatmap': heatmap, '@/lib/haptics': { haptics: { selection: () => {} } },
});
const yearlyGrid = Heatmap(year.props);
assert.equal(yearlyGrid.props.children[1].props.children.length, 365, 'The year SVG contains only days in the selected year');
picked = undefined;
const interactiveYear = Heatmap({ ...year.props, onSelectDate: (day) => { picked = day; } });
interactiveYear.props.onPress({ nativeEvent: { locationX: 0, locationY: 18 } });
assert.equal(picked, undefined, 'Padding days before January cannot be selected');
const step = year.props.squareSize + year.props.gap;
interactiveYear.props.onPress({ nativeEvent: { locationX: 0, locationY: 18 + step * 3 + 0.1 } });
assert.equal(picked, '2026-01-01');
picked = undefined;
const decemberOffset = date.daysBetween(year.props.startDate, '2026-12-31');
interactiveYear.props.onPress({ nativeEvent: { locationX: Math.floor(decemberOffset / 7) * step + 0.1, locationY: 18 + (decemberOffset % 7) * step + 0.1 } });
assert.equal(picked, undefined, 'Future days in the year cannot be edited');
console.log('Habits verified: leap-year periods, calendar alignment, date validation, goal progress, visible/toggle/hold undo, custom colors, month selection and year bounds.');
