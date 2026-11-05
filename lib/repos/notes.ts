import type { SQLiteDatabase } from 'expo-sqlite';
import { read, requireName, write } from './store';
import { parseBlockLayout } from '../noteCanvas';
export type Note = {
  id: number; title: string; folder: string | null; color: string | null; isPinned: number; isArchived: number;
  /** ISO time of a one-off reminder; it stays after it fires, shown as past, until removed. */
  reminderAt: string | null; createdAt: string; updatedAt: string;
};
export type NoteBlock = { id: number; noteId: number; type: 'TEXT' | 'IMAGE' | 'VOICE' | 'CHECKLIST' | 'DRAWING'; content: string | null; filePath: string | null; durationMs: number | null; position: number; layout?: string | null;
  /** A text block's bold, colour and highlight ranges, as JSON; null when it is plain. */
  spans?: string | null };
export type NoteDraft = { title: string; folder: string | null; color: string | null; isPinned: number; blocks: NoteBlock[] };
export type ChecklistItem = { text: string; done: boolean };

export function checklistItems(content: string | null): ChecklistItem[] {
  try {
    const items: unknown = JSON.parse(content ?? '[]');
    if (!Array.isArray(items)) return [];
    return items.filter((item): item is ChecklistItem => typeof item === 'object' && item !== null && typeof item.text === 'string' && typeof item.done === 'boolean');
  } catch { return []; }
}
/** Folders made with "+" are kept in settings, so a new folder shows before any note is in it. */
const FOLDERS_KEY = 'noteFolders';
const ORDER_KEY = 'noteOrder';
async function orderedNotes(db: SQLiteDatabase, archived: boolean): Promise<Note[]> {
  const notes = await db.getAllAsync<Note>('SELECT * FROM notes WHERE isArchived=? ORDER BY isPinned DESC,updatedAt DESC,id DESC', archived ? 1 : 0);
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', ORDER_KEY);
  let ids: unknown;
  try { ids = JSON.parse(row?.value ?? '[]'); } catch { ids = []; }
  const ranks = new Map<number, number>();
  if (Array.isArray(ids)) ids.forEach((id: unknown, index) => { if (typeof id === 'number') ranks.set(id, index); });
  // New notes stay at the front; editing a manually placed note keeps its position.
  return notes.sort((a, b) => b.isPinned - a.isPinned || (ranks.get(a.id) ?? -1) - (ranks.get(b.id) ?? -1));
}
/** Replace only visible slots, preserving hidden notes when searching or filtering folders. */
export const reorderNotes = (ids: number[]) => write(async (db) => {
  if (new Set(ids).size !== ids.length) throw new Error('A note cannot appear twice.');
  const notes = await orderedNotes(db, false);
  const selected = new Set(ids);
  if (ids.some((id) => !notes.some((note) => note.id === id))) throw new Error('A note is no longer available.');
  const groups = new Set(notes.filter((note) => selected.has(note.id)).map((note) => note.isPinned));
  if (groups.size > 1) throw new Error('Reorder pinned and other notes separately.');
  let index = 0;
  const order = notes.map((note) => selected.has(note.id) ? ids[index++] : note.id);
  await db.runAsync('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', ORDER_KEY, JSON.stringify(order));
});
async function savedFolders(db: SQLiteDatabase): Promise<string[]> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key=?', FOLDERS_KEY);
  try {
    const names: unknown = JSON.parse(row?.value ?? '[]');
    return Array.isArray(names) ? names.filter((name): name is string => typeof name === 'string') : [];
  } catch { return []; }
}
/** Created folders and folders notes use (archived ones too), alphabetically, each once. */
async function folderNames(db: SQLiteDatabase) {
  const used = (await db.getAllAsync<{ folder: string }>('SELECT DISTINCT folder FROM notes WHERE folder IS NOT NULL')).map((row) => row.folder);
  return [...new Set([...await savedFolders(db), ...used])].sort((a, b) => a.localeCompare(b));
}
export const listNoteFolders = () => read(folderNames);
/** Notes on the main grid, or with `archived` the archive, with their blocks and the folder list. */
export const listNotes = (archived = false) => read(async (db) => ({
  notes: await orderedNotes(db, archived),
  blocks: await db.getAllAsync<NoteBlock>('SELECT b.* FROM note_blocks b JOIN notes n ON n.id=b.noteId WHERE n.isArchived=? ORDER BY b.position,b.id', archived ? 1 : 0),
  folders: await folderNames(db),
  /** For the "Archived notes" row, shown only when there is something in it. */
  archivedCount: (await db.getFirstAsync<{ n: number }>('SELECT count(*) AS n FROM notes WHERE isArchived=?', archived ? 0 : 1))?.n ?? 0,
}));
/** Adds an empty folder. "All" is the built-in filter, and names are unique ignoring case. */
export function addFolder(name: string) {
  const clean = requireName(name);
  if (clean.toLowerCase() === 'all') throw new Error('"All" is already there. Choose another name.');
  return write(async (db) => {
    const saved = await savedFolders(db);
    const used = await db.getFirstAsync('SELECT 1 FROM notes WHERE lower(folder)=lower(?)', clean);
    if (used || saved.some((folder) => folder.toLowerCase() === clean.toLowerCase())) throw new Error('That folder already exists.');
    await db.runAsync('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', FOLDERS_KEY, JSON.stringify([...saved, clean]));
    return clean;
  });
}
export const getNote = (id: number) => read(async (db) => ({
  note: await db.getFirstAsync<Note>('SELECT * FROM notes WHERE id=?', id),
  blocks: await db.getAllAsync<NoteBlock>('SELECT * FROM note_blocks WHERE noteId=? ORDER BY position,id', id),
}));
export const createNote = () => write(async (db) => {
  const now = new Date().toISOString();
  const result = await db.runAsync('INSERT INTO notes(createdAt,updatedAt) VALUES (?,?)', now, now);
  return result.lastInsertRowId;
});

/** Save one coherent draft atomically so block reorder and text cannot get out of sync. */
export const saveNote = (id: number, draft: NoteDraft) => write(async (db) => {
  const exists = await db.getFirstAsync<{ id: number }>('SELECT id FROM notes WHERE id=?', id);
  if (!exists) throw new Error('This note was deleted.');
  await db.runAsync('UPDATE notes SET title=?,folder=?,color=?,isPinned=?,updatedAt=? WHERE id=?', draft.title, draft.folder?.trim() || null, draft.color, draft.isPinned ? 1 : 0, new Date().toISOString(), id);
  await db.runAsync('DELETE FROM note_blocks WHERE noteId=?', id);
  for (const [position, block] of draft.blocks.entries()) {
    if ((block.type === 'IMAGE' || block.type === 'VOICE') && !block.filePath) throw new Error('Media file is missing.');
    if (block.layout && !parseBlockLayout(block.layout)) throw new Error('Invalid block position or size.');
    await db.runAsync('INSERT INTO note_blocks(noteId,type,content,filePath,durationMs,position,layout,spans) VALUES (?,?,?,?,?,?,?,?)', id, block.type, block.content, block.filePath, block.durationMs, position, block.layout ?? null, block.spans ?? null);
  }
});
/** Keep's "Make a copy": same content and look, a fresh note that is not pinned, archived or reminded. */
export const duplicateNote = (id: number) => write(async (db) => {
  const note = await db.getFirstAsync<Note>('SELECT * FROM notes WHERE id=?', id);
  if (!note) throw new Error('This note was deleted.');
  const now = new Date().toISOString();
  const copy = await db.runAsync('INSERT INTO notes(title,folder,color,createdAt,updatedAt) VALUES (?,?,?,?,?)', note.title, note.folder, note.color, now, now);
  // Copies share photo and voice files; media is only reclaimed once no block refers to it.
  await db.runAsync('INSERT INTO note_blocks(noteId,type,content,filePath,durationMs,position,layout,spans) SELECT ?,type,content,filePath,durationMs,position,layout,spans FROM note_blocks WHERE noteId=? ORDER BY position,id',
    copy.lastInsertRowId, id);
  return copy.lastInsertRowId;
});
/** Archived notes leave the grid; like Keep, they also lose their pin. */
export const setNoteArchived = (id: number, archived: boolean) => write(async (db) => {
  await db.runAsync('UPDATE notes SET isArchived=?,isPinned=CASE WHEN ? THEN 0 ELSE isPinned END,updatedAt=? WHERE id=?',
    archived ? 1 : 0, archived ? 1 : 0, new Date().toISOString(), id);
});
/** Sets (an ISO time in the future) or clears the note's reminder; the OS schedule follows. */
export function setNoteReminder(id: number, at: string | null) {
  if (at !== null && (Number.isNaN(Date.parse(at)) || Date.parse(at) <= Date.now())) throw new Error('Choose a time in the future.');
  return write(async (db) => { await db.runAsync('UPDATE notes SET reminderAt=? WHERE id=?', at, id); }, 'reminders');
}
export const listNoteReminders = () => read((db) =>
  db.getAllAsync<Pick<Note, 'id' | 'title' | 'reminderAt'>>('SELECT id,title,reminderAt FROM notes WHERE reminderAt IS NOT NULL'));
export function setNoteProperty(id: number, key: 'isPinned' | 'folder' | 'color', value: string | number | null) {
  if (!['isPinned', 'folder', 'color'].includes(key)) throw new Error('Invalid note property.');
  return write(async (db) => { await db.runAsync(`UPDATE notes SET ${key}=?,updatedAt=? WHERE id=?`, value, new Date().toISOString(), id); });
}
// Deleting and restoring publish 'reminders' so a deleted note's reminder is cancelled (and comes back).
export const deleteNote = (id: number) => write(async (db) => {
  const note = await db.getFirstAsync<Note>('SELECT * FROM notes WHERE id=?', id);
  const blocks = await db.getAllAsync<NoteBlock>('SELECT * FROM note_blocks WHERE noteId=? ORDER BY position,id', id);
  await db.runAsync('DELETE FROM notes WHERE id=?', id);
  return { note, blocks };
}, 'reminders');
export const restoreNote = (snapshot: Awaited<ReturnType<typeof deleteNote>>) => write(async (db) => {
  const n = snapshot.note;
  if (!n) return;
  await db.runAsync('INSERT INTO notes(id,title,folder,color,isPinned,isArchived,reminderAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)',
    n.id, n.title, n.folder, n.color, n.isPinned, n.isArchived, n.reminderAt, n.createdAt, n.updatedAt);
  for (const b of snapshot.blocks) await db.runAsync('INSERT INTO note_blocks(noteId,type,content,filePath,durationMs,position,layout,spans) VALUES (?,?,?,?,?,?,?,?)', n.id, b.type, b.content, b.filePath, b.durationMs, b.position, b.layout ?? null, b.spans ?? null);
}, 'reminders');

export function notePreview(blocks: NoteBlock[]) {
  return blocks.map((block) => block.type === 'TEXT' ? block.content : block.type === 'CHECKLIST' ? checklistItems(block.content).map((i) => `${i.done ? '✓' : '☐'} ${i.text}`).join(' · ') : block.type === 'VOICE' ? 'Voice note' : block.type === 'DRAWING' ? 'Drawing' : 'Photo').filter(Boolean).join(' · ');
}
