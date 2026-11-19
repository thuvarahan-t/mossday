import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions, type ViewInstance } from 'react-native';
import { TabHeaderActions } from '@/components/navigation/HeaderActions';
import { TabSwipeArea } from '@/components/navigation/TabSwipeArea';
import { useShareWithOptions } from '@/components/share/ShareProvider';
import { estimateNoteHeight, NoteCard, noteSummary } from './NoteCard';
import { noteShareContent } from './notesShare';
import { NoteColorPicker } from './NoteColorPicker';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormSheet } from '@/components/ui/FormSheet';
import { GroupedList, ListRow, SectionHeader } from '@/components/ui/GroupedList';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { ReorderableMasonryGrid } from '@/components/ui/ReorderableMasonryGrid';
import { Icon } from '@/components/ui/Icon';
import { LoadState } from '@/components/ui/LoadState';
import { PressableScale } from '@/components/ui/PressableScale';
import { SearchField, TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useAction, useResource } from '@/hooks/useResource';
import { useTabBarInset } from '@/hooks/useTabBarInset';
import { useWindowTopOffset } from '@/hooks/useWindowTopOffset';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { useSheetState } from '@/hooks/useSheetState';
import { reclaimMediaLater } from '@/lib/media';
import { addFolder, createNote, deleteNote, listNotes, notePreview, reorderNotes, restoreNote, setNoteProperty, type Note } from '@/lib/repos/notes';

export function useNewNote(folder: string | null = null) {
  const action = useAction();
  return useCallback(() => { void action(async () => { const id = await createNote(folder); router.push({ pathname: '/note/[id]', params: { id } }); }); }, [action, folder]);
}
export function NotesScreen() {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  const { data, error, refresh } = useResource(listNotes);
  const [search, setSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const [folder, setFolder] = useState('All');
  const newNote = useNewNote(folder === 'All' ? null : folder);
  const { width: windowWidth } = useWindowDimensions();
  const tabBarInset = useTabBarInset();
  const windowTop = useWindowTopOffset();
  const folderTargets = useRef(new Map<string, ViewInstance>());
  const trashTarget = useRef<ViewInstance>(null);
  const [choosingCreation, setChoosingCreation, creationTransition] = useSheetState<true>();
  const creationAction = useRef<(() => void) | null>(null);
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
  const dropNote = async (note: Note, x: number, y: number) => {
    const contains = (target: ViewInstance | null) => new Promise<boolean>((resolve) => {
      if (!target) { resolve(false); return; }
      target.measureInWindow((left, top, width, height) => {
        resolve(x >= 0 && x < windowWidth && width > 0 && height > 0 && x >= left && x <= left + width &&
          y >= top + windowTop && y <= top + windowTop + height);
      });
    });
    const destinations = folders.slice(1);
    const [trash, ...hits] = await Promise.all([
      contains(trashTarget.current),
      ...destinations.map((name) => contains(folderTargets.current.get(name) ?? null)),
    ]);
    if (trash) { remove(note); return true; }
    const target = destinations[hits.indexOf(true)];
    if (!target) return false;
    if (target !== note.folder) await action(() => setNoteProperty(note.id, 'folder', target));
    return true;
  };
  const pinned = filtered.filter((note) => note.isPinned);
  const others = filtered.filter((note) => !note.isPinned);
  const grid = (notes: Note[]) => <ReorderableMasonryGrid items={notes}
    label={(note) => noteSummary(note, blocksFor(note.id)).title}
    onPress={(note) => router.push({ pathname: '/note/[id]', params: { id: note.id } })}
    onReorder={(ids) => action(() => reorderNotes(ids))} onDraggingChange={setDragging} onDropOutside={dropNote}
    actions={(note) => [
        { label: note.isPinned ? 'Unpin' : 'Pin', icon: 'pin', onPress: () => { void action(() => setNoteProperty(note.id, 'isPinned', note.isPinned ? 0 : 1)); } },
        { label: 'Folder', icon: 'folder', onPress: () => { setFolderName(note.folder ?? ''); setFolderNote(note); } },
        { label: 'Change colour', icon: 'palette', onPress: () => setColorNote(note) },
        { label: 'Delete', icon: 'trash', destructive: true, onPress: () => remove(note) },
      ]}
    renderItem={(note, width) => <NoteCard note={note} blocks={blocksFor(note.id)} width={width} />}
    estimateHeight={(note, width) => estimateNoteHeight(note, blocksFor(note.id), width)} />;
  const share = useShareWithOptions();
  // Sharing asks which note first, then how; the second sheet waits for the first to close.
  const [choosingNote, setChoosingNote, choosingTransition] = useSheetState<true>();
  const noteToShare = useRef<Note | null>(null);
  const shareNotes = () => {
    if (filtered.length) setChoosingNote(true);
    else toast({ message: 'There are no notes to share yet.' });
  };
  return <LargeTitleScreen title="Notes" scrollEnabled={!dragging} floatingAdd={{ label: 'New note or folder', onPress: () => setChoosingCreation(true) }}
    overlay={<View ref={trashTarget} collapsable={false} pointerEvents="none" accessibilityElementsHidden={!dragging} importantForAccessibility={dragging ? 'yes' : 'no-hide-descendants'}
      style={{ position: 'absolute', alignSelf: 'center', bottom: tabBarInset + theme.spacing.sm, opacity: dragging ? 1 : 0,
        backgroundColor: theme.colors.card, borderRadius: theme.radii.card, padding: theme.spacing.md, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Icon name="trash" color="dangerText" /><Text color="dangerText">Drop to delete</Text>
    </View>}
    swipeArea={(page) => <TabSwipeArea tab="notes" enabled={!dragging} style={{ flex: 1 }}>{page}</TabSwipeArea>}
    titleAccessory={<TabHeaderActions shareLabel="Share notes" onShare={shareNotes} />} contentContainerStyle={{ gap: theme.spacing.md, flexGrow: 1 }} fixedContent={<View style={{ gap: theme.spacing.md }}>
      <SearchField value={search} onChangeText={setSearch} />
      {/* A horizontal ScrollView grows by default; in this flex-grown column it would push the grid down. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}>
        {folders.map((name) => <View key={name} collapsable={false} ref={(target) => {
          if (target) folderTargets.current.set(name, target);
          else folderTargets.current.delete(name);
        }}><Chip label={name} selected={folder === name} onPress={() => setFolder(name)} size="small" /></View>)}
        <PressableScale haptic="tap" accessibilityLabel="New note or folder" onPress={() => setChoosingCreation(true)}
          style={{ width: theme.sizes.smallChipHeight, height: theme.sizes.smallChipHeight, borderRadius: theme.sizes.smallChipHeight / 2,
            alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.fill }}>
          <Icon name="plus" size={theme.sizes.iconSmall} color="accent" strokeWidth={2.6} />
        </PressableScale>
      </ScrollView>
    </View>}>
      {error || !data ? <LoadState error={error} retry={refresh} /> : !filtered.length ? <EmptyState icon="note" title={search ? 'No results' : 'No notes'} message={search ? 'Try another search or folder.' : 'Ideas, recipes and voice memos will show up here.'} action={{ label: 'New Note', onPress: newNote }} /> : <>
        {/* Headings only when both groups exist; otherwise the grid starts right under the folders. */}
        {pinned.length > 0 && others.length > 0 ? <>
          <SectionHeader title="Pinned" />{grid(pinned)}
          <SectionHeader title="Others" />{grid(others)}
        </> : grid(filtered)}
      </>}
    {choosingNote && <FormSheet {...choosingTransition} size="fit" title="Share which note?" onClose={() => setChoosingNote(null)} onDismissed={() => {
      choosingTransition.onDismissed();
      const note = noteToShare.current;
      noteToShare.current = null;
      if (note) share(noteShareContent({ theme, title: note.title, blocks: blocksFor(note.id) }));
    }}>
      <GroupedList style={{ marginHorizontal: 0 }}>
        {filtered.map((note) => {
          const { title, preview } = noteSummary(note, blocksFor(note.id));
          return <ListRow key={note.id} title={title} subtitle={preview || undefined} icon={{ icon: 'note', color: 'yellow' }} accessory="chevron"
            onPress={() => { noteToShare.current = note; setChoosingNote(null); }} />;
        })}
      </GroupedList>
    </FormSheet>}
    {colorNote && <FormSheet {...colorTransition} size="fit" title="Note colour" onClose={() => setColorNote(null)}>
      <NoteColorPicker color={colorNote.color} onChange={(color) => {
        void action(() => setNoteProperty(colorNote.id, 'color', color), () => setColorNote(null));
      }} />
    </FormSheet>}
    {choosingCreation && <FormSheet {...creationTransition} size="fit" title="Create" onClose={() => setChoosingCreation(null)} onDismissed={() => {
      creationTransition.onDismissed();
      const next = creationAction.current;
      creationAction.current = null;
      next?.();
    }}>
      <GroupedList style={{ marginHorizontal: 0 }}>
        <ListRow title="New note" onPress={() => { creationAction.current = newNote; setChoosingCreation(null); }} />
        <ListRow title="New folder" onPress={() => {
          creationAction.current = () => { setNewFolderName(''); setCreatingFolder(true); };
          setChoosingCreation(null);
        }} />
      </GroupedList>
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
