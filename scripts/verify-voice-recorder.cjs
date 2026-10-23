// Exercise async recording gestures without a device or native audio module.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function mount({ permission, preparation, stopFails = false } = {}) {
  const tasks = [];
  const cleanups = [];
  const calls = { record: 0, stop: 0, save: 0, cancel: 0, errors: [], modes: [] };
  let gesture;
  const recorder = {
    prepareToRecordAsync: () => preparation?.promise ?? Promise.resolve(),
    record: () => { calls.record += 1; },
    stop: async () => { calls.stop += 1; if (stopFails) throw new Error('Native stop failed'); },
    getStatus: () => ({ durationMillis: 1000, metering: -20 }),
    uri: 'file:///sample.m4a',
  };
  const dependencies = {
    'expo-audio': {
      RecordingPresets: { HIGH_QUALITY: {} },
      requestRecordingPermissionsAsync: () => permission?.promise ?? Promise.resolve({ granted: true }),
      setAudioModeAsync: async (mode) => { calls.modes.push(mode); },
      useAudioRecorder: () => recorder,
    },
    react: {
      useState: (value) => [value, () => {}],
      useRef: (current) => ({ current }),
      useEffect: (effect) => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); },
    },
    'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
    'react-native': { StyleSheet: { create: (styles) => styles }, View: () => null },
    'react-native-gesture-handler': {
      GestureDetector: () => null,
      usePanGesture: (options) => { gesture = options; return options; },
    },
    'react-native-reanimated': {
      default: { View: () => null },
      useAnimatedStyle: () => ({}), useReducedMotion: () => true,
      useSharedValue: (value) => ({ get: () => value, set: (next) => { value = next; } }),
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0 }) },
    'react-native-worklets': { scheduleOnRN: (callback, ...args) => { tasks.push(Promise.resolve(callback(...args))); } },
    '@/constants/motion': { durations: {}, easing: {} },
    '@/hooks/useTheme': { useTheme: () => ({ radii: {}, colors: {}, spacing: {}, sizes: {} }) },
    '@/lib/animation': { animateTo: (value) => value },
    '@/lib/date': { formatDuration: () => '0:00' },
    '@/lib/haptics': { haptics: { tick() {}, success() {}, warning() {} } },
    '../Icon': {}, '../Text': {}, './Waveform': {},
  };
  const source = ts.transpileModule(fs.readFileSync('components/ui/voice/VoiceRecorder.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    setInterval, clearInterval,
  });
  exports.VoiceRecorder({
    onSave: () => { calls.save += 1; },
    onCancel: () => { calls.cancel += 1; },
    onError: (message) => calls.errors.push(message),
  });
  return {
    calls, tasks,
    begin: () => gesture.onBegin(),
    release: (cancel = false) => {
      if (cancel) gesture.onUpdate({ translationX: -150 });
      gesture.onFinalize();
    },
    unmount: () => cleanups.forEach((cleanup) => cleanup()),
  };
}

async function main() {
  const permission = deferred();
  const pendingPermission = mount({ permission });
  pendingPermission.begin();
  pendingPermission.release();
  permission.resolve({ granted: true });
  await Promise.all(pendingPermission.tasks);
  assert.equal(pendingPermission.calls.record, 0, 'Release during permission must not start recording');

  const preparation = deferred();
  const pendingPreparation = mount({ preparation });
  pendingPreparation.begin();
  await Promise.resolve();
  await Promise.resolve();
  pendingPreparation.release();
  preparation.resolve();
  await Promise.all(pendingPreparation.tasks);
  assert.equal(pendingPreparation.calls.record, 0, 'Release during preparation must not start recording');
  assert.equal(pendingPreparation.calls.modes.at(-1).allowsRecording, false);

  for (const cancel of [false, true]) {
    const active = mount();
    active.begin();
    await Promise.all(active.tasks);
    active.release(cancel);
    await Promise.all(active.tasks);
    assert.equal(active.calls.record, 1);
    assert.equal(active.calls.stop, 1);
    assert.equal(active.calls.save, cancel ? 0 : 1);
    assert.equal(active.calls.cancel, cancel ? 1 : 0);
  }

  const failure = mount({ stopFails: true });
  failure.begin();
  await Promise.all(failure.tasks);
  failure.release();
  await Promise.all(failure.tasks);
  assert.equal(failure.calls.save, 0, 'Never save a recording after native stop fails');
  assert.equal(failure.calls.errors.length, 1);

  const abandoned = mount();
  abandoned.begin();
  await Promise.all(abandoned.tasks);
  abandoned.unmount();
  assert.equal(abandoned.calls.stop, 1, 'Leaving the screen stops the microphone');
  assert.equal(abandoned.calls.save, 0);
  console.log('Voice recorder verified: async release, cancel, save, stop failure, and unmount.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
