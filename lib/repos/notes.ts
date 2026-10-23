import { read, write } from './store';
export type Note = { id: number; title: string; folder: string | null; color: string | null; isPinned: number; createdAt: string; updatedAt: string };
export type NoteBlock = { id: number; noteId: number; type: 'TEXT' | 'IMAGE' | 'VOICE' | 'CHECKLIST'; content: string | null; filePath: string | null; durationMs: number | null; position: number };
export type NoteDraft = { title: string; folder: string | null; color: string | null; isPinned: number; blocks: NoteBlock[] };
export type ChecklistItem = { text: string; done: boolean };

export function checklistItems(content: string | null): ChecklistItem[] {
  try {
    const items: unknown = JSON.parse(content ?? '[]');
    if (!Array.isArray(items)) return [];
    return items.filter((item): item is ChecklistItem => typeof item === 'object' && item !== null && typeof item.text === 'string' && typeof item.done === 'boolean');
  } catch { return []; }
}
export const listNotes = () => read(async (db) => ({
  notes: await db.getAllAsync<Note>('SELECT * FROM notes ORDER BY isPinned DESC,updatedAt DESC,id DESC'),
  blocks: await db.getAllAsync<NoteBlock>('SELECT * FROM note_blocks ORDER BY position,id'),
}));
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
    await db.runAsync('INSERT INTO note_blocks(noteId,type,content,filePath,durationMs,position) VALUES (?,?,?,?,?,?)', id, block.type, block.content, block.filePath, block.durationMs, position);
  }
});
export function setNoteProperty(id: number, key: 'isPinned' | 'folder' | 'color', value: string | number | null) {
  if (!['isPinned', 'folder', 'color'].includes(key)) throw new Error('Invalid note property.');
  return write(async (db) => { await db.runAsync(`UPDATE notes SET ${key}=?,updatedAt=? WHERE id=?`, value, new Date().toISOString(), id); });
}
export const deleteNote = (id: number) => write(async (db) => {
  const note = await db.getFirstAsync<Note>('SELECT * FROM notes WHERE id=?', id);
  const blocks = await db.getAllAsync<NoteBlock>('SELECT * FROM note_blocks WHERE noteId=? ORDER BY position,id', id);
  await db.runAsync('DELETE FROM notes WHERE id=?', id);
  return { note, blocks };
});
export const restoreNote = (snapshot: Awaited<ReturnType<typeof deleteNote>>) => write(async (db) => {
  const n = snapshot.note;
  if (!n) return;
  await db.runAsync('INSERT INTO notes(id,title,folder,color,isPinned,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?)', n.id, n.title, n.folder, n.color, n.isPinned, n.createdAt, n.updatedAt);
  for (const b of snapshot.blocks) await db.runAsync('INSERT INTO note_blocks(noteId,type,content,filePath,durationMs,position) VALUES (?,?,?,?,?,?)', n.id, b.type, b.content, b.filePath, b.durationMs, b.position);
});

export function notePreview(blocks: NoteBlock[]) {
  return blocks.map((block) => block.type === 'TEXT' ? block.content : block.type === 'CHECKLIST' ? checklistItems(block.content).map((i) => `${i.done ? '✓' : '☐'} ${i.text}`).join(' · ') : block.type === 'VOICE' ? 'Voice note' : 'Photo').filter(Boolean).join(' · ');
}
