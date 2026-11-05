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
const tiny = geometry.scaleBlockLayout(layout, 0.01, 340);
assert.equal(tiny.width, 0.2, 'Pinching in stops at a usable size');
const huge = geometry.scaleBlockLayout({ ...layout, x: 0.5 }, 50, 340);
assert.equal(huge.width, 1); assert.equal(huge.x, 0, 'Pinching out near the edge slides the photo back onto the page');
assert.equal(geometry.scaleBlockLayout(layout, 1.2, 340).ratio, layout.ratio, 'Pinching keeps the photo proportions');
const blocks = [
  { id: 1, type: 'TEXT', content: 'Old text' },
  { id: 2, type: 'IMAGE', filePath: 'photo.jpg', layout: JSON.stringify(layout) },
  { id: 3, type: 'VOICE', filePath: 'voice.m4a', layout: JSON.stringify({ x: 0, y: 500, width: 0.8 }) },
];
const insertionPoint = { x: 0.5, y: 100, width: 0.5 };
const pendingText = { id: -1, type: 'TEXT', content: '', layout: JSON.stringify(insertionPoint) };
const insertedPhoto = geometry.insertCanvasBlock([blocks[0], pendingText], { id: 4, type: 'IMAGE', filePath: 'new.jpg' }, 340, {}, -1);
assert.equal(insertedPhoto.length, 2, 'Adding media replaces an empty insertion line instead of leaving a blank block');
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
assert.equal(geometry.canvasFrames(tallerPhoto, 340, { 2: { width: 170, height: 100 } })[2].height, 340,
  'A photo height follows its saved ratio, not a stale native measurement');

const placedFrames = { 1: { x: 0, y: 0, width: 1, height: 100 }, 2: { x: 0, y: 300, width: 0.5, height: 50 } };
const placedBlocks = [{ id: 1, type: 'TEXT', content: 'Written' }, { id: 2, type: 'IMAGE' }];
assert.deepEqual({ ...geometry.textPlacement(placedBlocks, placedFrames, 200) }, { x: 0, y: 188, width: 1 }, 'A touch writes at the left edge, centred on that line');
assert.equal(geometry.textPlacement(placedBlocks, placedFrames, 105).y, 100, 'A new line never covers the text above it');
assert.equal(geometry.textPlacement([{ id: 1, type: 'TEXT', content: ' ' }], { 1: placedFrames[1] }, 50).y, 38, 'An empty line being replaced does not push the new one down');

const jsx = (type, props, key) => ({ type, props, key });
const shared = (initial) => { let value = initial; return { get: () => value, set: (next) => { value = next; } }; };
const panGestures = [];
const pinchGestures = [];
let frameCallback;
let inserted;
let saved;
let deleted;
const selections = [];
const dragging = [];
const scroll = { ref: {}, offset: shared(0), top: shared(100), bottom: shared(600), max: shared(1500) };
const { NoteCanvas } = load('components/notes/NoteCanvas.tsx', {
  react: { useContext: () => scroll, useEffect: () => {}, useLayoutEffect: (fn) => fn(), useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { View: 'View', Pressable: 'Pressable', Keyboard: { dismiss: () => {} }, StyleSheet: { absoluteFill: {}, create: (styles) => styles } },
  'react-native-gesture-handler': { GestureDetector: 'GestureDetector', usePanGesture: (config) => { panGestures.push(config); return config; },
    usePinchGesture: (config) => { pinchGestures.push(config); return config; }, useSimultaneousGestures: (...gestures) => gestures },
  'react-native-reanimated': { __esModule: true, default: { View: 'AnimatedView' }, useSharedValue: shared, useAnimatedStyle: (fn) => ({ evaluate: fn }),
    useFrameCallback: (fn) => { frameCallback = fn; }, scrollTo: () => {} },
  'react-native-worklets': { scheduleOnRN: (fn, ...args) => fn(...args) },
  '@/components/ui/DragScrollContext': { DragScrollContext: {} },
  '@/components/ui/Icon': { Icon: 'Icon' }, '@/components/ui/PressableScale': { PressableScale: 'PressableScale' },
  '@/hooks/useTheme': { useTheme: () => ({ spacing: { xs: 4, sm: 8 }, sizes: { iconSmall: 18 }, colors: { accent: 'green', background: 'white', card: 'white' }, shadows: { raised: 'shadow' } }) },
  '@/lib/haptics': { haptics: { selection: () => {} } }, '@/lib/noteCanvas': geometry,
});
const flatten = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
const canvasProps = { blocks, width: 340, onSelect: (id) => selections.push(id), onPlaceText: (point) => { inserted = point; }, onFrames: () => {},
  onChangeLayout: (next) => { saved = next; }, onDelete: (block) => { deleted = block.id; }, onManipulating: (active) => dragging.push(active) };
let wasHeld;
const renderCanvas = (selectedId) => NoteCanvas({ ...canvasProps, selectedId, renderBlock: (block, _width, style, held) => { if (block.type === 'IMAGE') { wasHeld = held; imageStyle = style; } return block.type; } });
let imageStyle;

const page = renderCanvas(null);
assert.equal(page.type, 'View', 'The page has no hint text or extra controls around it');
assert.equal(page.props.style.height, undefined, 'A short note fills the screen without a fixed scrollable height');
assert.equal(page.props.style.flexGrow, 1);
page.props.children[0].props.onPress({ nativeEvent: { locationX: 170, locationY: 900 } });
assert.equal(inserted.x, 0); assert.equal(inserted.width, 1); assert.equal(inserted.y, 888, 'A touch anywhere writes from the left edge of that line');

const [textItem, photoItem, audioItem] = page.props.children[1];
const text = textItem.type(textItem.props);
assert.equal(text.type, 'AnimatedView', 'Text is not wrapped in a drag gesture, so long press still selects words');
assert.equal(flatten(text).some((node) => node.props?.accessibilityRole === 'adjustable' || node.type === 'Icon'), false, 'Text has no box, handle or button');
panGestures.length = 0; pinchGestures.length = 0;

const photo = photoItem.type(photoItem.props);
assert.equal(photo.type, 'GestureDetector');
const [move] = panGestures;
const [pinch] = pinchGestures;
assert.ok(move.enabled && move.activateAfterLongPress > 0, 'A photo moves only after a long press, so a touch can still open it or scroll');
assert.equal(pinch.enabled, true);
const style = photo.props.children.props.style.at(-1);
assert.equal(flatten(photo).some((node) => node.type === 'Icon'), false, 'An unselected photo draws no controls');

photo.props.children.props.onTouchStart();
assert.equal(wasHeld(), false, 'A plain touch is free to open the photo');
move.onActivate({ absoluteY: 300 });
assert.deepEqual(selections, [2], 'Picking a photo up selects it');
assert.equal(wasHeld(), true, 'The release of a long press must not open the photo');
assert.equal(wasHeld(), false);
move.onUpdate({ translationX: 50, translationY: 80, absoluteY: 380 });
assert.equal(style.evaluate().transform[1].translateY, 330, 'The photo follows the finger vertically');
assert.ok(style.evaluate().transform[0].translateX > layout.x * 340, 'The photo moves sideways too');
assert.equal(saved, undefined, 'Drag previews do not write the draft');
move.onDeactivate({ canceled: false }); move.onFinalize({ canceled: false });
assert.equal(saved[2].y, 330, 'Drop commits the actual position');

const beforePinch = imageStyle.evaluate().height;
pinch.onActivate(); pinch.onUpdate({ scale: 1.2 });
assert.ok(imageStyle.evaluate().height > beforePinch, 'Two fingers resize the photo live');
pinch.onDeactivate({ canceled: true }); pinch.onFinalize({ canceled: true });
assert.equal(imageStyle.evaluate().height, beforePinch, 'A canceled pinch restores the photo size');
pinch.onActivate(); pinch.onUpdate({ scale: 1.2 });
pinch.onDeactivate({ canceled: false }); pinch.onFinalize({ canceled: false });
assert.ok(saved[2].width > layout.width, 'A finished pinch saves the new size');
assert.equal(saved[2].ratio, layout.ratio);

move.onActivate({ absoluteY: 590 });
move.onUpdate({ translationX: 0, translationY: 10, absoluteY: 590 });
frameCallback({ timeSincePreviousFrame: 16 });
assert.ok(scroll.offset.get() > 0, 'Edge dragging scrolls to off-screen placement space');
move.onDeactivate({ canceled: true }); move.onFinalize({ canceled: true });

const selectedPage = renderCanvas(2);
selections.length = 0; inserted = undefined;
selectedPage.props.children[0].props.onPress({ nativeEvent: { locationX: 170, locationY: 900 } });
assert.deepEqual(selections, [null], 'With a photo picked up, blank space first only deselects it');
assert.equal(inserted, undefined);
const selectedPhoto = selectedPage.props.children[1][1];
const selectedTree = selectedPhoto.type(selectedPhoto.props);
flatten(selectedTree).find((node) => node.props?.accessibilityLabel === 'Delete photo').props.onPress();
assert.equal(deleted, 2, 'A picked-up photo offers its delete button');

panGestures.length = 0;
audioItem.type(audioItem.props);
const audioMove = panGestures[0];
assert.ok(audioMove.enabled, 'Audio moves the same way as photos');
audioMove.onActivate({ absoluteY: 300 });
audioMove.onUpdate({ translationX: 50, translationY: -100, absoluteY: 200 });
audioMove.onDeactivate({ canceled: false }); audioMove.onFinalize({ canceled: false });
assert.ok(saved[3].x > 0 && saved[3].y < 500, 'Audio uses the same free positioning as photos');
assert.ok(dragging.includes(true) && dragging.at(-1) === false, 'Scrolling unlocks after manipulating a block');

// The cursor is scrolled above the keyboard, once, however many signals announce it.
let keyboardShown;
let scrollCalls = [];
const scrollOffset = shared(0);
const focusedInput = { measureInWindow: (callback) => callback(0, 500 - scrollOffset.get(), 340, 400) };
let focused = focusedInput;
const scrollViewRef = { current: {
  measureInWindow: (callback) => callback(0, 100, 340, 350),
  scrollTo: ({ y }) => { scrollCalls.push(y); scrollOffset.set(y); },
} };
let caretHandle;
let firstShared = true;
const { DragScrollView } = load('components/ui/DragScrollView.tsx', {
  react: { useCallback: (fn) => fn, useEffect: (fn) => fn(), useImperativeHandle: (_ref, create) => { caretHandle = create(); }, useRef: (value) => ({ current: value }) },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { TextInput: { State: { currentlyFocusedInput: () => focused } }, Keyboard: { addListener: (_name, listener) => { keyboardShown = listener; return { remove: () => {} }; } } },
  'react-native-reanimated': { default: { ScrollView: 'ScrollView' }, useAnimatedRef: () => scrollViewRef, useAnimatedScrollHandler: () => () => {},
    useSharedValue: (initial) => { if (firstShared) { firstShared = false; return scrollOffset; } return shared(initial); } },
  '@/hooks/useWindowTopOffset': { useWindowTopOffset: () => 0 }, './DragScrollContext': { DragScrollContext: { Provider: 'Provider' } },
});
const scrollView = DragScrollView({ children: null });
scrollView.props.onTouchStart({ nativeEvent: { pageY: 700 } });
keyboardShown({ endCoordinates: { screenY: 450 } });
assert.deepEqual(scrollCalls, [298], 'The line that was touched scrolls to just above the keyboard, not the end of a long block');
keyboardShown({ endCoordinates: { screenY: 450 } });
assert.deepEqual(scrollCalls, [298], 'A second signal for the same keyboard does not scroll further');
caretHandle(true);
assert.equal(scrollCalls.length, 2, 'A new last line while typing keeps the end of the text visible');
scrollCalls = [];
focused = null;
keyboardShown({ endCoordinates: { screenY: 450 } });
assert.deepEqual(scrollCalls, [], 'Nothing scrolls without a focused field');
const viewerGestures = {};
const { PhotoViewer } = load('components/notes/PhotoViewer.tsx', {
  'expo-image': { Image: 'Image' }, 'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { Modal: 'Modal', useWindowDimensions: () => ({ width: 400, height: 800 }) },
  'react-native-gesture-handler': { GestureDetector: 'GestureDetector', GestureHandlerRootView: 'GestureHandlerRootView',
    usePanGesture: (config) => { viewerGestures.pan = config; return config; }, usePinchGesture: (config) => { viewerGestures.pinch = config; return config; },
    useTapGesture: (config) => { viewerGestures.tap = config; return config; }, useSimultaneousGestures: (...gestures) => gestures },
  'react-native-reanimated': { __esModule: true, default: { View: 'AnimatedView' }, useAnimatedStyle: (fn) => ({ evaluate: fn }), useReducedMotion: () => false, useSharedValue: shared },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0 }) }, '@/components/ui/Icon': { Icon: 'Icon' }, '@/components/ui/PressableScale': { PressableScale: 'PressableScale' },
  '@/hooks/useTheme': { useTheme: () => ({ spacing: { lg: 16 }, sizes: { circleButton: 44 }, radii: { pill: 999 } }) }, '@/lib/animation': { animateTo: (value) => value },
});
const viewer = PhotoViewer({ uri: 'photo.jpg', onClose: () => {} });
assert.equal(viewer.props.children.type, 'GestureHandlerRootView', 'Gestures in a Modal need their own root on Android');
const photoTransform = () => flatten(viewer).find((node) => node.type === 'AnimatedView').props.style.evaluate().transform;
viewerGestures.pan.onActivate(); viewerGestures.pan.onUpdate({ translationX: 90, translationY: 90 });
assert.equal(photoTransform()[0].translateX, 0, 'A photo at normal size does not drag');
viewerGestures.pinch.onActivate(); viewerGestures.pinch.onUpdate({ scale: 99 });
assert.equal(photoTransform()[2].scale, 5, 'Two fingers zoom up to the limit');
viewerGestures.pinch.onUpdate({ scale: 0.01 });
assert.equal(photoTransform()[2].scale, 1, 'Pinching in stops at the whole photo');
viewerGestures.tap.onActivate();
assert.equal(photoTransform()[2].scale, 2.5, 'Double tap zooms in');
viewerGestures.pan.onActivate(); viewerGestures.pan.onUpdate({ translationX: 9999, translationY: 0 });
assert.equal(photoTransform()[0].translateX, 300, 'A zoomed photo pans only as far as its edge');
viewerGestures.tap.onActivate();
assert.equal(photoTransform()[2].scale, 1, 'Double tap zooms back out');
assert.equal(photoTransform()[0].translateX, 0, 'Zooming out recentres the photo');
console.log('Note canvas verified: photo zoom, legacy flow, line placement, no text chrome, hold to move, pinch resize and cancel, tap after hold, bounds, edge scrolling, deletion and cursor above the keyboard.');
