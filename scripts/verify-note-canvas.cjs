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
const geometry = load('lib/noteCanvas.ts');
const layout = { x: 0.2, y: 250, width: 0.5, ratio: 4 / 3 };
assert.ok(geometry.parseBlockLayout(geometry.serializeBlockLayout(layout)));
for (const raw of ['bad json', '{}', '{"x":-1,"y":0,"width":1}', '{"x":0.9,"y":0,"width":0.5}', '{"x":0,"y":0,"width":0.5,"ratio":0}']) {
  assert.equal(geometry.parseBlockLayout(raw), null, 'Malformed or off-page layout is rejected');
}
const clamped = geometry.moveBlockLayout(layout, 9999, -9999, 340);
assert.equal(clamped.x, 0.5); assert.equal(clamped.y, 0);
const tiny = geometry.resizeBlockLayout(layout, -9999, -9999, 340);
assert.ok(tiny.width >= 0.2 && tiny.ratio >= 0.2 && tiny.ratio <= 5, 'Resize stays usable at extreme drag distances');
const huge = geometry.resizeBlockLayout(layout, 9999, 9999, 340);
assert.ok(huge.x + huge.width <= 1 && huge.ratio >= 0.2);
const blocks = [
  { id: 1, type: 'TEXT', content: 'Old text' },
  { id: 2, type: 'IMAGE', filePath: 'photo.jpg', layout: JSON.stringify(layout) },
  { id: 3, type: 'VOICE', filePath: 'voice.m4a', layout: JSON.stringify({ x: 0, y: 500, width: 0.8 }) },
];
const insertionPoint = { x: 0.5, y: 100, width: 0.5 };
const pendingText = { id: -1, type: 'TEXT', content: '', layout: JSON.stringify(insertionPoint) };
const insertedPhoto = geometry.insertCanvasBlock([blocks[0], pendingText], { id: 4, type: 'IMAGE', filePath: 'new.jpg' }, 340, {}, -1);
assert.equal(insertedPhoto.length, 2, 'Adding media replaces an empty insertion box instead of leaving a blank block');
assert.equal(geometry.parseBlockLayout(insertedPhoto[1].layout).y, 100, 'Media appears at the selected insertion point');
assert.equal(insertedPhoto[0].content, 'Old text', 'Inserting media preserves existing text');
const insertedAudio = geometry.insertCanvasBlock(blocks, { id: 5, type: 'VOICE' }, 340, {}, null, { x: 0.7, y: 20, width: 0.3 });
const audioLayout = geometry.parseBlockLayout(insertedAudio.at(-1).layout);
assert.ok(audioLayout.width * 340 >= 220 && audioLayout.x + audioLayout.width <= 1, 'New audio fits playback controls at a right-edge insertion point');
const old = geometry.canvasFrames([{ id: 1, type: 'TEXT', content: 'One' }, { id: 2, type: 'TEXT', content: 'Two' }], 340,
  { 1: { width: 340, height: 200 } });
assert.equal(old[2].y, 216, 'Legacy blocks keep their measured vertical sequence');
assert.equal(geometry.canvasFrames(blocks, 680)[2].width, 0.5, 'Horizontal composition survives a wider device');
const tallerPhoto = [{ ...blocks[1], layout: JSON.stringify({ ...layout, ratio: 0.5 }) }];
assert.ok(geometry.canvasFrames(tallerPhoto, 340, { 2: { width: 170, height: 100 } })[2].height > 340,
  'Height-only resize cannot be overridden by stale native measurements');

const jsx = (type, props) => ({ type, props });
const shared = (initial) => { let value = initial; return { get: () => value, set: (next) => { value = next; } }; };
const gestures = [];
let frameCallback;
let imageStyle;
let inserted;
let saved;
let deleted;
const dragging = [];
const scroll = { ref: {}, offset: shared(0), top: shared(100), bottom: shared(600), max: shared(1500) };
const { NoteCanvas } = load('components/notes/NoteCanvas.tsx', {
  react: { useContext: () => scroll, useEffect: () => {}, useLayoutEffect: (fn) => fn(), useState: (value) => [value, () => {}] },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { View: 'View', Pressable: 'Pressable', Keyboard: { dismiss: () => {} }, StyleSheet: { absoluteFill: {}, create: (styles) => styles } },
  'react-native-gesture-handler': { GestureDetector: 'GestureDetector', usePanGesture: (config) => { gestures.push(config); return config; } },
  'react-native-reanimated': { default: { View: 'AnimatedView' }, useSharedValue: shared, useAnimatedStyle: (fn) => ({ evaluate: fn }),
    useFrameCallback: (fn) => { frameCallback = fn; }, scrollTo: () => {} },
  'react-native-worklets': { scheduleOnRN: (fn, ...args) => fn(...args) },
  '@/components/ui/Button': { Button: 'Button' }, '@/components/ui/DragScrollContext': { DragScrollContext: {} },
  '@/components/ui/Icon': { Icon: 'Icon' }, '@/components/ui/PressableScale': { PressableScale: 'PressableScale' }, '@/components/ui/Text': { Text: 'Text' },
  '@/hooks/useTheme': { useTheme: () => ({ spacing: { xs: 4, sm: 8 }, colors: { accent: 'green', background: 'white' } }) },
  '@/lib/haptics': { haptics: { selection: () => {} } }, '@/lib/noteCanvas': geometry,
});
const tree = NoteCanvas({ blocks, width: 340, selectedId: 2, onSelect: () => {}, onPlaceText: (point) => { inserted = point; }, onFrames: () => {},
  onChangeLayout: (next) => { saved = next; }, onDelete: (block) => { deleted = block.id; }, onManipulating: (active) => dragging.push(active),
  renderBlock: (block, _width, style) => { if (block.type === 'IMAGE') imageStyle = style; return block.type; } });
const canvas = tree.props.children[1];
canvas.props.children[0].props.onPress({ nativeEvent: { locationX: 170, locationY: 300 } });
assert.equal(inserted.x, 0.5); assert.equal(inserted.y, 300); assert.equal(inserted.width, 0.5, 'Blank-space taps preserve the chosen insertion point');
const photo = canvas.props.children[1][1];
const rendered = photo.type(photo.props);
const [move, resize] = gestures;
const style = rendered.props.style.at(-1);
move.onActivate({ absoluteY: 300 });
move.onUpdate({ translationX: 50, translationY: 80, absoluteY: 380 });
assert.equal(style.evaluate().transform[1].translateY, 330, 'The photo follows the finger vertically');
assert.ok(style.evaluate().transform[0].translateX > layout.x * 340, 'The photo moves sideways too');
assert.equal(saved, undefined, 'Drag previews do not write the draft');
move.onDeactivate({ canceled: false }); move.onFinalize({ canceled: false });
assert.equal(saved[2].y, 330, 'Drop commits the actual position');
const beforeResize = imageStyle.evaluate().height;
resize.onActivate(); resize.onUpdate({ translationX: 20, translationY: 50 });
assert.ok(imageStyle.evaluate().height > beforeResize, 'Photo resize previews update the visible image frame');
resize.onDeactivate({ canceled: true }); resize.onFinalize({ canceled: true });
assert.equal(imageStyle.evaluate().height, beforeResize, 'Canceled resize restores the photo dimensions');
resize.onActivate(); resize.onUpdate({ translationX: 20, translationY: 50 });
resize.onDeactivate({ canceled: false }); resize.onFinalize({ canceled: false });
assert.ok(saved[2].width > layout.width && saved[2].ratio !== layout.ratio, 'Resized width and aspect ratio commit together');
move.onActivate({ absoluteY: 590 });
move.onUpdate({ translationX: 0, translationY: 10, absoluteY: 590 });
frameCallback({ timeSincePreviousFrame: 16 });
assert.ok(scroll.offset.get() > 0, 'Edge dragging scrolls to off-screen placement space');
move.onDeactivate({ canceled: true }); move.onFinalize({ canceled: true });
rendered.props.children[0].props.children[1].props.onPress();
assert.equal(deleted, 2, 'Selected block retains a delete control');
const audio = canvas.props.children[1][2];
audio.type(audio.props);
const audioMove = gestures[2];
audioMove.onActivate({ absoluteY: 300 });
audioMove.onUpdate({ translationX: 50, translationY: -100, absoluteY: 200 });
audioMove.onDeactivate({ canceled: false }); audioMove.onFinalize({ canceled: false });
assert.ok(saved[3].x > 0 && saved[3].y < 500, 'Audio uses the same free positioning as photos');
assert.ok(dragging.includes(true) && dragging.at(-1) === false, 'Scrolling unlocks after manipulating a block');
console.log('Note canvas verified: legacy flow, placement, photo/audio movement, resize preview/save/cancel, bounds, edge scrolling and deletion.');
