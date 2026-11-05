import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { TabHeaderActions } from '@/components/navigation/HeaderActions';
import { TabSwipeArea } from '@/components/navigation/TabSwipeArea';
import { useShare } from '@/components/share/ShareProvider';
import { estimateNoteHeight, NoteCard, noteSummary } from './NoteCard';
import { audioPaths, notesShareContent } from './notesShare';
import { NoteColorPicker } from './NoteColorPicker';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormSheet } from '@/components/ui/FormSheet';
import { SectionHeader } from '@/components/ui/GroupedList';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { ReorderableMasonryGrid } from '@/components/ui/ReorderableMasonryGrid';
import { Icon } from '@/components/ui/Icon';
import { LoadState } from '@/components/ui/LoadState';
import { PressableScale } from '@/components/ui/PressableScale';
import { SearchField, TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useSheetState } from '@/hooks/useSheetState';
import { reclaimMediaLater } from '@/lib/media';
import { addFolder, createNote, deleteNote, listNotes, notePreview, reorderNotes, restoreNote, setNoteProperty, type Note } from '@/lib/repos/notes';

export function useNewNote() {
  const action = useAction();
  return useCallback(() => { void action(async () => { const id = await createNote(); router.push({ pathname: '/note/[id]', params: { id } }); }); }, [action]);
}
export function NotesScreen() {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  const newNote = useNewNote();
  const { data, error, refresh } = useResource(listNotes);
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const [folder, setFolder] = useState('All');
  const [folderNote, setFolderNote, folderTransition] = useSheetState<Note>();
  const [folderName, setFolderName] = useState('');
  const [colorNote, setColorNote, colorTransition] = useSheetState<Note>();
  // Only folders the user made or uses; "+" at the end of the row adds one.
  const folders = ['All', ...(data?.folders ?? [])];
  const [creatingFolder, setCreatingFolder, creatingTransition] = useSheetState<true>();
  const [newFolderName, setNewFolderName] = useState('');
  const createFolder = () => {
    void action(async () => { setFolder(await addFolder(newFolderName)); }, () => setCreatingFolder(null));
  };
  const blocksFor = (id: number) => data?.blocks.filter((b) => b.noteId === id) ?? [];
  const filtered = data?.notes.filter((note) => (folder === 'All' || note.folder === folder) &&
    `${note.title} ${notePreview(blocksFor(note.id))}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  const remove = (note: Note) => { void action(async () => {
    const snapshot = await deleteNote(note.id);
    reclaimMediaLater(snapshot.blocks.flatMap((b) => b.filePath ? [b.filePath] : []));
    toast({ message: 'Note deleted', actionLabel: 'Undo', onAction: () => { void action(() => restoreNote(snapshot)); } });
  }); };
  const pinned = filtered.filter((note) => note.isPinned);
  const others = filtered.filter((note) => !note.isPinned);
  const grid = (notes: Note[]) => <ReorderableMasonryGrid items={notes}
    label={(note) => noteSummary(note, blocksFor(note.id)).title}
    onPress={(note) => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
    onReorder={(ids) => action(() => reorderNotes(ids))} onDraggingChange={setDragging}
    actions={(note) => [
        { label: note.isPinned ? 'Unpin' : 'Pin', icon: 'pin', onPress: () => { void action(() => setNoteProperty(note.id, 'isPinned', note.isPinned ? 0 : 1)); } },
        { label: 'Folder', icon: 'folder', onPress: () => { setFolderName(note.folder ?? ''); setFolderNote(note); } },
        { label: 'Change colour', icon: 'palette', onPress: () => setColorNote(note) },
        { label: 'Delete', icon: 'trash', destructive: true, onPress: () => remove(note) },
      ]}
    renderItem={(note, width) => <NoteCard note={note} blocks={blocksFor(note.id)} width={width} />}
    estimateHeight={(note, width) => estimateNoteHeight(note, blocksFor(note.id), width)} />;
  const share = useShare();
  const shareNotes = () => {
    share(notesShareContent({ theme, notes: filtered.map((note) => ({ id: note.id, pinned: !!note.isPinned, ...noteSummary(note, blocksFor(note.id)) })),
      audio: filtered.flatMap((note) => audioPaths(blocksFor(note.id))) }));
  };
  return <LargeTitleScreen title="Notes" scrollEnabled={!dragging} floatingAdd={{ label: 'New note', onPress: newNote }}
    swipeArea={(page) => <TabSwipeArea tab="notes" enabled={!dragging} style={{ flex: 1 }}>{page}</TabSwipeArea>}
    titleAccessory={<TabHeaderActions shareLabel="Share notes" onShare={shareNotes} />} contentContainerStyle={{ gap: theme.spacing.md, flexGrow: 1 }}>
      <SearchField value={search} onChangeText={setSearch} />
      {/* A horizontal ScrollView grows by default; in this flex-grown column it would push the grid down. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}>
        {folders.map((name) => <Chip key={name} label={name} selected={folder === name} onPress={() => setFolder(name)} size="small" />)}
        <PressableScale haptic="tap" accessibilityLabel="New folder" onPress={() => { setNewFolderName(''); setCreatingFolder(true); }}
          style={{ width: theme.sizes.smallChipHeight, height: theme.sizes.smallChipHeight, borderRadius: theme.sizes.smallChipHeight / 2,
            alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.fill }}>
          <Icon name="plus" size={theme.sizes.iconSmall} color="accent" strokeWidth={2.6} />
        </PressableScale>
      </ScrollView>
      {error || !data ? <LoadState error={error} retry={refresh} /> : !filtered.length ? <EmptyState icon="note" title={search ? 'No results' : 'No notes'} message={search ? 'Try another search or folder.' : 'Ideas, recipes and voice memos will show up here.'} action={{ label: 'New Note', onPress: newNote }} /> : <>
        {/* Headings only when both groups exist; otherwise the grid starts right under the folders. */}
        {pinned.length > 0 && others.length > 0 ? <>
          <SectionHeader title="Pinned" />{grid(pinned)}
          <SectionHeader title="Others" />{grid(others)}
        </> : grid(filtered)}
      </>}
    {colorNote && <FormSheet {...colorTransition} size="fit" title="Note colour" onClose={() => setColorNote(null)}>
      <NoteColorPicker color={colorNote.color} onChange={(color) => {
        void action(() => setNoteProperty(colorNote.id, 'color', color), () => setColorNote(null));
      }} />
    </FormSheet>}
    {creatingFolder && <FormSheet {...creatingTransition} size="fit" dense dockToKeyboard title="New folder" onClose={() => setCreatingFolder(null)}
      trailing={<Button title="Add" size="small" disabled={!newFolderName.trim()} onPress={createFolder} />}>
      <TextField value={newFolderName} onChangeText={setNewFolderName} placeholder="Folder name" accessibilityLabel="New folder name" autoFocus
        returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={() => { if (newFolderName.trim()) createFolder(); }} />
    </FormSheet>}
    {folderNote && <FormSheet {...folderTransition} title="Move to folder" onClose={() => setFolderNote(null)}><TextField value={folderName} onChangeText={setFolderName} placeholder="Folder name (empty for none)" accessibilityLabel="Folder name" />
      <Button title="Save" onPress={() => { void action(() => setNoteProperty(folderNote.id, 'folder', folderName.trim() || null), () => setFolderNote(null)); }} /></FormSheet>}
  </LargeTitleScreen>;
}
