const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, setTimeout, Promise, requestAnimationFrame: (callback) => callback(),
    require: (name) => { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return exports;
}

async function main() {
  const shared = [];
  const files = [];
  class FakeFile {
    constructor(...parts) { this.uri = parts.map((part) => part.uri ?? part).join('/'); this.exists = false; files.push(this); }
    delete() { this.exists = false; this.deleted = true; }
    move(target) { target.exists = true; }
    copy(target) { target.exists = true; this.copiedTo = target; }
    async write(data) { this.written = data; this.exists = true; }
    async bytes() { return new Uint8Array([1, 2, 3]); }
    async base64() { return 'QkFTRTY0'; }
  }
  let printed;
  const shareFiles = load('lib/shareFiles.ts', {
    'expo-file-system': { File: FakeFile, Paths: { cache: { uri: 'cache:' } } },
    'expo-print': { printToFileAsync: async (options) => { printed = options; return { uri: 'print.pdf' }; } },
    'expo-sharing': { shareAsync: async (uri, options) => { shared.push({ uri, ...options }); } },
    fflate: { zipSync: (archive) => ({ names: Object.keys(archive) }) },
    './media': { mediaFile: (path) => new FakeFile(`media/${path}`) },
  });

  assert.equal(shareFiles.shareFileName('Trip: plan/2026?', 'pdf'), 'Trip plan 2026.pdf', 'File names are safe on every platform');
  assert.equal(shareFiles.shareFileName('தமிழ் குறிப்பு', 'pdf'), 'தமிழ் குறிப்பு.pdf');
  assert.equal(shareFiles.shareFileName('///', 'zip'), 'Mossday.zip');
  assert.equal(shareFiles.escapeHtml('<b>&"'), '&lt;b&gt;&amp;&quot;');

  await shareFiles.sharePdf('<p>x</p>', 'My note', { width: 380, height: 900 });
  assert.equal(printed.width, 380); assert.equal(printed.height, 900);
  assert.ok(shared[0].uri.endsWith('My note.pdf')); assert.equal(shared[0].mimeType, 'application/pdf');
  assert.ok(files.find((file) => file.uri.endsWith('My note.pdf')).deleted, 'The temporary PDF is removed after sharing');

  shared.length = 0;
  await shareFiles.shareAudioFiles(['one.m4a'], 'My note');
  assert.ok(shared[0].uri.endsWith('My note.m4a'), 'One recording is shared as itself');
  assert.equal(shared[0].mimeType, 'audio/mp4');
  shared.length = 0;
  await shareFiles.shareAudioFiles(['one.m4a', 'two.m4a', 'three.m4a'], 'My note');
  assert.ok(shared[0].uri.endsWith('My note audio.zip'), 'Several recordings travel together');
  const zip = files.find((file) => file.uri.endsWith('My note audio.zip'));
  assert.deepEqual(Array.from(zip.written.names), ['Audio 1.m4a', 'Audio 2.m4a', 'Audio 3.m4a'], 'The ZIP holds every recording and nothing else');
  await assert.rejects(shareFiles.shareAudioFiles([], 'Empty'));

  // The provider: choices, the wait for its own sheet to close, and each format's route.
  const jsx = (type, props, key) => ({ type, props, key });
  const toasts = [];
  const sent = [];
  const textShares = [];
  let sheetValue = null;
  let stateSlot = 0;
  const states = [];
  const react = {
    createContext: () => ({ Provider: 'ContextProvider' }), useCallback: (fn) => fn, useContext: () => null, useRef: (value) => ({ current: value }),
    useState: (initial) => {
      const slot = stateSlot++;
      if (!(slot in states)) states[slot] = initial;
      return [states[slot], (next) => { states[slot] = next; }];
    },
  };
  const captured = [];
  const { ShareProvider } = load('components/share/ShareProvider.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async (uri, options) => { sent.push({ uri, ...options }); } },
    'react-native': { Share: { share: async (message) => { textShares.push(message); } }, StyleSheet: { create: (styles) => styles }, View: 'View' },
    'react-native-view-shot': { captureRef: async (_ref, options) => { captured.push(options); return options.result === 'base64' ? 'BASE' : 'card.png'; } },
    '@/components/ui/FormSheet': { FormSheet: 'FormSheet' }, '@/components/ui/GroupedList': { GroupedList: 'GroupedList', ListRow: 'ListRow' },
    '@/components/ui/Toast': { useToast: () => (toast) => toasts.push(toast) },
    '@/hooks/useSheetState': { useSheetState: () => [sheetValue, (value) => { sheetValue = value; }, { visible: true, onDismissed: () => {} }] },
    '@/lib/shareFiles': { cardPdfHtml: (base64) => `html:${base64}`,
      shareAudioFiles: async (paths, title) => { sent.push({ audio: paths, title }); },
      sharePdf: async (html, title, size) => { sent.push({ html, title, size }); } },
    './ShareCard': { ShareCard: 'ShareCard', SHARE_CARD_WIDTH: 380 },
  });
  const render = () => { stateSlot = 0; return ShareProvider({ children: null }); };
  const flatten = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
  const rows = (tree) => flatten(tree).filter((node) => node.type === 'ListRow');
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  const open = render().props.value;
  const content = { icon: 'note', title: 'Trip', body: 'body', text: 'Plain words' };

  open(content);
  assert.deepEqual(rows(render()).map((row) => row.props.title), ['PDF', 'Text', 'Image'], 'Without recordings, Audio is not offered');
  open({ ...content, audio: ['a.m4a', 'b.m4a'] });
  const withAudio = rows(render());
  assert.deepEqual(withAudio.map((row) => row.props.title), ['PDF', 'Text', 'Image', 'Audio']);
  assert.match(withAudio[3].props.subtitle, /2 recordings/);

  const choose = async (title) => {
    const tree = render();
    rows(tree).find((row) => row.props.title === title).props.onPress();
    assert.equal(sheetValue, null, 'Choosing closes the sheet first');
    assert.equal(sent.length + textShares.length, 0, 'Nothing opens until the sheet has closed');
    flatten(tree).find((node) => node.type === 'FormSheet').props.onDismissed();
    await flush();
  };
  await choose('Audio');
  assert.deepEqual(Array.from(sent[0].audio), ['a.m4a', 'b.m4a'], 'Audio sends the recordings only');
  sent.length = 0;

  open(content);
  await choose('Text');
  assert.equal(textShares[0].message, 'Plain words');
  textShares.length = 0;

  const finishCapture = async () => {
    await flush();
    const card = flatten(render()).find((node) => node.props?.collapsable === false);
    card.props.onLayout({ nativeEvent: { layout: { height: 640 } } });
    await flush(); await flush();
  };
  open(content);
  await choose('Image');
  await finishCapture();
  assert.equal(sent[0].uri, 'card.png'); assert.equal(sent[0].mimeType, 'image/png');
  sent.length = 0;

  open(content);
  await choose('PDF');
  await finishCapture();
  assert.equal(sent[0].html, 'html:BASE', 'Without its own document, the PDF is the captured card');
  assert.equal(sent[0].size.width, 380); assert.equal(sent[0].size.height, 640, 'The page is exactly the card');
  sent.length = 0;

  open({ ...content, pdfHtml: async () => 'document' });
  await choose('PDF');
  assert.equal(sent[0].html, 'document', 'A note uses its real document');
  assert.equal(sent[0].size, undefined);
  sent.length = 0;

  // A note as a document.
  const layout = (y) => JSON.stringify({ x: 0, y, width: 1 });
  const notePdf = load('components/notes/notePdf.ts', {
    '@/constants/colors': { accents: { light: { red: '#FF3B30' } } }, '@/lib/date': { formatDuration: () => '0:05' },
    '@/lib/media': { mediaFile: (path) => new FakeFile(path) }, '@/lib/noteCanvas': load('lib/noteCanvas.ts'),
    '@/lib/repos/notes': { checklistItems: (content) => JSON.parse(content) }, '@/lib/shareFiles': { escapeHtml: shareFiles.escapeHtml },
    './drawing': load('components/notes/drawing.ts'),
  });
  const html = await notePdf.notePdfHtml('A <title>', [
    { id: 1, type: 'TEXT', content: 'Second & last', layout: layout(300) },
    { id: 2, type: 'IMAGE', filePath: 'photo.jpg', layout: layout(100) },
    { id: 3, type: 'CHECKLIST', content: JSON.stringify([{ text: 'Done', done: true }]), layout: layout(50) },
    { id: 4, type: 'VOICE', filePath: 'v.m4a', durationMs: 5000, layout: layout(400) },
    { id: 5, type: 'DRAWING', content: JSON.stringify({ aspect: 1, strokes: [{ tool: 'pen', color: 'red', points: [0, 0, 0.5, 0.5] }] }), layout: layout(500) },
  ]);
  assert.match(html, /<h1>A &lt;title&gt;<\/h1>/, 'Titles are escaped');
  assert.match(html, /Second &amp; last/);
  assert.match(html, /data:image\/jpeg;base64,QkFTRTY0/, 'Photos are inlined because a WebView cannot read app files');
  assert.ok(html.indexOf('Done') < html.indexOf('QkFTRTY0') && html.indexOf('QkFTRTY0') < html.indexOf('Second'), 'The document reads top to bottom as placed');
  assert.match(html, /stroke="#FF3B30"/);
  console.log('Share verified: format choices, audio only when present, wait for the sheet, PDF routes, ZIP contents, cleanup and note documents.');
}
main().catch((error) => { console.error(error); process.exit(1); });
