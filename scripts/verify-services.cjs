const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { unzipSync, strFromU8 } = require('fflate');

function load(file, dependencies) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, Date, setTimeout,
    require: (name) => { assert.ok(name in dependencies, `Unexpected dependency: ${name}`); return dependencies[name]; },
  }, { filename: file });
  return exports;
}

async function main() {
  const files = new Map([['file:///source.jpg', Uint8Array.from([1, 2, 3])]]);
  class File {
    constructor(...parts) { this.uri = parts.map((part) => typeof part === 'string' ? part : part.uri).join('/'); }
    get name() { return this.uri.split('/').at(-1); }
    get exists() { return files.has(this.uri); }
    get size() { return files.get(this.uri)?.length ?? 0; }
    copy(destination) { assert.ok(this.exists); files.set(destination.uri, files.get(this.uri)); }
    delete() { files.delete(this.uri); }
    async bytes() { return files.get(this.uri); }
    async write(bytes) { files.set(this.uri, bytes); }
  }
  class Directory {
    constructor(...parts) { this.uri = parts.map((part) => typeof part === 'string' ? part : part.uri).join('/'); }
    create() {}
    list() { return [...files.keys()].filter((key) => key.startsWith(`${this.uri}/`)).map((key) => new File(key)); }
    get size() { return this.list().reduce((total, file) => total + file.size, 0); }
  }
  let references = [];
  const db = {
    getAllAsync: async () => references.map((filePath) => ({ filePath })),
    getFirstAsync: async (sql) => sql.includes('page_count') ? { page_count: 2 } : { page_size: 4096 },
    serializeAsync: async () => Uint8Array.from([83, 81, 76, 105, 116, 101]),
  };
  const store = { read: async (operation) => operation(db), write: async (operation) => operation(db) };
  const fileSystem = { File, Directory, Paths: { document: 'file:///documents', cache: 'file:///cache' } };
  const media = load('lib/media.ts', { 'expo-file-system': fileSystem, './repos/store': store });
  assert.throws(() => media.mediaFile('../escape.jpg'));
  const imported = media.importMedia('file:///source.jpg', 'jpg');
  assert.ok(media.mediaFile(imported).exists);
  references = [imported];
  await media.collectMedia();
  assert.ok(media.mediaFile(imported).exists, 'Referenced media must survive cleanup');
  let shared;
  let sharedBytes;
  const backup = load('lib/backup.ts', {
    'expo-file-system': fileSystem,
    'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async (uri) => { shared = uri; sharedBytes = files.get(uri); } },
    fflate: require('fflate'), './media': media, './repos/store': store,
    'react-native': { Platform: { OS: 'android' } },
  });
  assert.equal(await backup.storageBytes(), 8195);
  await backup.exportBackup();
  const archive = unzipSync(sharedBytes);
  assert.equal(files.has(shared), false, 'Export does not leave temporary ZIPs in cache');
  assert.equal(archive['mossday.db'][0], 83);
  assert.deepEqual([...archive[`media/${imported}`]], [1, 2, 3]);
  assert.equal(JSON.parse(strFromU8(archive['manifest.json'])).app, 'Mossday');
  references = [];
  await media.collectMedia([imported]);
  assert.equal(media.mediaFile(imported).exists, false, 'Unreferenced media is removed');

  let resized;
  let releasedContext = 0;
  let releasedImage = 0;
  let failSave = false;
  const images = load('lib/images.ts', {
    './media': { importMedia: (_uri, extension) => `photo.${extension}` },
    'expo-image-manipulator': {
      SaveFormat: { JPEG: 'jpeg' },
      ImageManipulator: { manipulate: () => ({
        resize: (size) => { resized = size; },
        renderAsync: async () => ({
          saveAsync: async () => { if (failSave) throw new Error('save failed'); return { uri: 'file:///compressed.jpg' }; },
          release: () => { releasedImage += 1; },
        }),
        release: () => { releasedContext += 1; },
      }) },
    },
  });
  assert.equal(await images.importNotePhoto({ uri: 'photo', width: 2000, height: 4000 }), 'photo.jpg');
  assert.equal(resized.height, 1600, 'Portrait photos are bounded by their longest edge');
  failSave = true;
  await assert.rejects(images.importNotePhoto({ uri: 'photo', width: 4000, height: 2000 }));
  assert.equal(resized.width, 1600);
  assert.equal(releasedContext, 2, 'Release native contexts on success and failure');
  assert.equal(releasedImage, 2, 'Release native image buffers on success and failure');

  let allowed = true;
  const preferences = new Map();
  const scheduled = new Map([['mossday:obsolete', { identifier: 'mossday:obsolete' }], ['other-app', { identifier: 'other-app' }]]);
  const notifications = {
    AndroidImportance: { DEFAULT: 3 }, SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly' },
    setNotificationChannelAsync: async () => {}, requestPermissionsAsync: async () => ({ granted: allowed }), getPermissionsAsync: async () => ({ granted: allowed }),
    getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
    cancelScheduledNotificationAsync: async (id) => { scheduled.delete(id); },
    scheduleNotificationAsync: async (request) => { scheduled.set(request.identifier, request); },
  };
  const reminderDb = {
    getAllAsync: async () => [...preferences].map(([key, value]) => ({ key, value })),
    runAsync: async (_sql, key, value) => { preferences.set(key, value); },
  };
  const reminders = load('lib/reminders.ts', {
    'expo-notifications': notifications, 'react-native': { Platform: { OS: 'android' } },
    './repos/habits': { listHabits: async () => [{ id: 1, name: 'Water', activeDays: 65, reminderTime: '10:15' }] },
    './repos/store': { read: async (operation) => operation(reminderDb), write: async (operation) => operation(reminderDb) },
  });
  await reminders.saveMealReminder({ name: 'Lunch', time: '14:00', enabled: true });
  await reminders.syncReminders();
  assert.equal(scheduled.has('mossday:obsolete'), false);
  assert.equal(scheduled.has('other-app'), true, 'Do not cancel unrelated schedules');
  const weekly = [...scheduled.values()].filter((s) => s.trigger?.type === 'weekly');
  assert.deepEqual(weekly.map((s) => s.trigger.weekday).sort(), [1, 2], 'Monday bit 0 maps to weekday 2; Sunday bit 6 maps to 1');
  assert.ok([...scheduled.values()].some((s) => s.trigger?.type === 'daily' && s.trigger.hour === 14));
  const count = scheduled.size;
  await reminders.syncReminders();
  assert.equal(scheduled.size, count, 'Sync is idempotent');
  allowed = false;
  await assert.rejects(reminders.saveMealReminder({ name: 'Breakfast', time: '09:00', enabled: true }));
  assert.equal(preferences.has('meal:Breakfast'), false, 'Denied permission does not enable reminder');
  await assert.rejects(reminders.saveMealReminder({ name: 'Breakfast', time: '99:99', enabled: true }));
  console.log('Services verified: media ownership/cleanup, ZIP contents, schedule reconciliation, weekday masks, permissions.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
