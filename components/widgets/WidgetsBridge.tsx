import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { listNotes, notePreview } from '@/lib/repos/notes';
import { subscribeToStore } from '@/lib/repos/store';

export function WidgetsBridge() {
  useEffect(() => {
    if (Platform.OS !== 'ios' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;
    let disposed = false;
    let revision = 0;
    let lastSnapshot = '';
    const refresh = async () => {
      const request = ++revision;
      const [{ default: widget }, { notes, blocks }] = await Promise.all([import('./NotesWidget'), listNotes()]);
      if (disposed || request !== revision) return;
      const ordered = [...notes.filter((note) => note.isPinned), ...notes.filter((note) => !note.isPinned)];
      const snapshot = {
        count: notes.length,
        notes: ordered.slice(0, 7).map((note) => ({
          id: note.id,
          title: (note.title.trim() || notePreview(blocks.filter((block) => block.noteId === note.id)) || 'Untitled note').slice(0, 100),
          pinned: !!note.isPinned,
        })),
      };
      const serialized = JSON.stringify(snapshot);
      if (serialized === lastSnapshot) return;
      widget.updateSnapshot(snapshot);
      lastSnapshot = serialized;
    };
    const update = () => { void refresh().catch((error: unknown) => { if (__DEV__) console.warn('Notes widget refresh failed', error); }); };
    update();
    const unsubscribe = subscribeToStore(update);
    const foreground = AppState.addEventListener('change', (state) => { if (state === 'active') update(); });
    return () => { disposed = true; unsubscribe(); foreground.remove(); };
  }, []);
  return null;
}
