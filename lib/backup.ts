import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { strToU8, zipSync } from 'fflate';
import { Platform } from 'react-native';
import { mediaDirectory, mediaFile } from './media';
import { read, write } from './repos/store';

const MAX_BACKUP_BYTES = 32 * 1024 * 1024;

export async function storageBytes() {
  const database = await read(async (db) => {
    const pages = await db.getFirstAsync<{ page_count: number }>('PRAGMA page_count');
    const size = await db.getFirstAsync<{ page_size: number }>('PRAGMA page_size');
    return (pages?.page_count ?? 0) * (size?.page_size ?? 0);
  });
  return database + (Platform.OS === 'web' ? 0 : mediaDirectory().size ?? 0);
}

/** Serialize SQLite rather than copying its live WAL files; include only referenced media. */
export async function exportBackup() {
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable on this device.');
  if (await storageBytes() > MAX_BACKUP_BYTES) throw new Error('This backup exceeds the current 32 MB export limit.');
  const files = await write(async (db) => {
    const archive: Record<string, Uint8Array> = { 'mossday.db': await db.serializeAsync() };
    const media = await db.getAllAsync<{ filePath: string }>('SELECT DISTINCT filePath FROM note_blocks WHERE filePath IS NOT NULL');
    for (const row of media) archive[`media/${row.filePath}`] = await mediaFile(row.filePath).bytes();
    return archive;
  });
  files['manifest.json'] = strToU8(JSON.stringify({ app: 'Mossday', version: 1, createdAt: new Date().toISOString(), database: 'mossday.db' }));
  const output = new File(Paths.cache, `mossday-${Date.now()}.zip`);
  await output.write(zipSync(files, { level: 0 }));
  try {
    await Sharing.shareAsync(output.uri, { mimeType: 'application/zip', dialogTitle: 'Save your Mossday backup' });
  } finally {
    // Sharing copies the file before resolving; repeated exports must not fill cache.
    if (output.exists) output.delete();
  }
}
