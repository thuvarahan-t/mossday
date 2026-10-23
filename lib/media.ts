import { Directory, File, Paths } from 'expo-file-system';
import { read } from './repos/store';

export function mediaDirectory() {
  const directory = new Directory(Paths.document, 'media');
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}
export function mediaFile(path: string) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(path) || path === '.' || path === '..') throw new Error('Invalid media path.');
  return new File(mediaDirectory(), path);
}
export function importMedia(uri: string, extension: string) {
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension.replace(/[^a-z0-9]/gi, '') || 'bin'}`;
  new File(uri).copy(mediaFile(name));
  return name;
}

/** Only reclaim unreferenced files after the Undo window and on a subsequent app launch. */
export async function collectMedia(paths?: string[]) {
  const referenced = await read((db) => db.getAllAsync<{ filePath: string }>('SELECT filePath FROM note_blocks WHERE filePath IS NOT NULL'));
  const keep = new Set(referenced.map((row) => row.filePath));
  const candidates = paths ? paths.map(mediaFile) : mediaDirectory().list().filter((file): file is File => file instanceof File);
  for (const file of candidates) if (!keep.has(file.name) && file.exists) file.delete();
}
export function reclaimMediaLater(paths: string[]) {
  // Undo is transient. If the process exits first, startup cleanup collects these files.
  setTimeout(() => { void collectMedia(paths).catch(() => undefined); }, 30_000);
}
