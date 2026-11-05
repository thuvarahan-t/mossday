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
export async function importMedia(uri: string, extension: string) {
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension.replace(/[^a-z0-9]/gi, '') || 'bin'}`;
  // Copying is asynchronous: the name is only good once the file is really there.
  await new File(uri).copy(mediaFile(name));
  return name;
}

/**
 * A new, empty place for the next file to share, clearing out the previous one. Files stay until
 * then rather than being deleted after sharing: Android only hands the receiving app a link, and
 * it may read the file long after the share sheet has returned.
 */
export function shareFile(name: string) {
  const directory = new Directory(Paths.cache, 'shared');
  if (directory.exists) directory.delete();
  directory.create({ idempotent: true, intermediates: true });
  return new File(directory, name);
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
