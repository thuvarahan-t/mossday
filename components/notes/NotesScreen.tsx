import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { HeaderActions } from '@/components/navigation/HeaderActions';
import { useShareImage } from '@/components/share/ShareImage';
import { notesShareContent } from './notesShare';
import { Button } from '@/components/ui/Button';
import { AnimatedListItem } from '@/components/ui/AnimatedListItem';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormSheet } from '@/components/ui/FormSheet';
import { GroupedList, ListRow, SectionHeader } from '@/components/ui/GroupedList';
import { LargeTitleScreen } from '@/components/ui/LargeTitleScreen';
import { LoadState } from '@/components/ui/LoadState';
import { Text } from '@/components/ui/Text';
import { SearchField, TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useAction, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { useSheetState } from '@/hooks/useSheetState';
import { formatRelativeTimestamp } from '@/lib/date';
import { mediaFile, reclaimMediaLater } from '@/lib/media';
import { createNote, deleteNote, listNotes, notePreview, restoreNote, setNoteProperty, type Note, type NoteBlock } from '@/lib/repos/notes';

export function useNewNote() {
  const action = useAction();
  return useCallback(() => { void action(async () => { const id = await createNote(); router.push({ pathname: '/note/[id]', params: { id } }); }); }, [action]);
}
/** Like iOS Notes: without a heading, the first line of the body becomes the title. */
function noteSummary(note: Note, blocks: NoteBlock[]) {
  const preview = notePreview(blocks).trim();
  if (note.title.trim()) return { title: note.title.trim(), preview };
  const [first = '', ...rest] = preview.split('\n');
  return { title: first.trim() || 'New note', preview: rest.join(' ').trim() };
}

export function NotesScreen() {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  const newNote = useNewNote();
  const { data, error, refresh } = useResource(listNotes);
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('All');
  const [folderNote, setFolderNote, folderTransition] = useSheetState<Note>();
  const [folderName, setFolderName] = useState('');
  const folders = ['All', ...new Set(['University', 'Ideas', 'Recipes', ...(data?.notes.flatMap((n) => n.folder ? [n.folder] : []) ?? [])])];
  const blocksFor = (id: number) => data?.blocks.filter((b) => b.noteId === id) ?? [];
  const filtered = data?.notes.filter((note) => (folder === 'All' || note.folder === folder) &&
    `${note.title} ${notePreview(blocksFor(note.id))}`.toLowerCase().includes(search.toLowerCase())) ?? [];
  const remove = (note: Note) => { void action(async () => {
    const snapshot = await deleteNote(note.id);
    reclaimMediaLater(snapshot.blocks.flatMap((b) => b.filePath ? [b.filePath] : []));
    toast({ message: 'Note deleted', actionLabel: 'Undo', onAction: () => { void action(() => restoreNote(snapshot)); } });
  }); };
  const renderNote = (note: Note, pinned: boolean) => {
    const blocks: NoteBlock[] = blocksFor(note.id);
    const image = blocks.find((b) => b.type === 'IMAGE' && b.filePath);
    const { title, preview } = noteSummary(note, blocks);
    const time = formatRelativeTimestamp(note.updatedAt);
    return <AnimatedListItem key={note.id} style={pinned ? { width: '48%' } : undefined}><ContextMenu accessibilityLabel={title}
      onPress={() => router.push({ pathname: '/note/[id]', params: { id: note.id } })} actions={[
        { label: note.isPinned ? 'Unpin' : 'Pin', icon: 'pin', onPress: () => { void action(() => setNoteProperty(note.id, 'isPinned', note.isPinned ? 0 : 1)); } },
        { label: 'Folder', icon: 'folder', onPress: () => { setFolderName(note.folder ?? ''); setFolderNote(note); } },
        { label: 'Change colour', icon: 'palette', onPress: () => { void action(() => setNoteProperty(note.id, 'color', note.color ? null : 'yellow')); } },
        { label: 'Delete', icon: 'trash', destructive: true, onPress: () => remove(note) },
      ]}>
      {pinned ? <Card inset={false} style={{ gap: theme.spacing.sm, backgroundColor: note.color ? theme.colors.accentFill : theme.colors.card }}>
        {image?.filePath && <Image source={{ uri: mediaFile(image.filePath).uri }} style={{ height: theme.sizes.habitRing * 1.6, width: '100%', borderRadius: theme.radii.md }} accessibilityLabel="Note photo" />}
        <Text variant="headline" numberOfLines={2}>{title}</Text>
        {preview ? <Text color="secondaryLabel" numberOfLines={2}>{preview}</Text> : null}
        <Text variant="footnote" color="secondaryLabel">{time}</Text>
      </Card> : <ListRow title={title} titleVariant="headline" subtitle={preview ? `${time} · ${preview}` : time} />}
    </ContextMenu></AnimatedListItem>;
  };
  const shareImage = useShareImage();
  const shareNotes = () => {
    void shareImage(notesShareContent({ theme, notes: filtered.map((note) => ({ id: note.id, pinned: !!note.isPinned, ...noteSummary(note, blocksFor(note.id)) })) }));
  };
  return <LargeTitleScreen title="Notes" titleAccessory={<HeaderActions actions={[
    { icon: 'share', label: 'Share notes', onPress: shareNotes },
    { icon: 'plus', label: 'New note', primary: true, onPress: newNote },
  ]} />} contentContainerStyle={{ gap: theme.spacing.md }}>
    <SearchField value={search} onChangeText={setSearch} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm }}>
      {folders.map((name) => <Chip key={name} label={name} selected={folder === name} onPress={() => setFolder(name)} size="small" />)}
    </ScrollView>
    {error || !data ? <LoadState error={error} retry={refresh} /> : !filtered.length ? <EmptyState icon="note" title={search ? 'No results' : 'No notes'} message={search ? 'Try another search or folder.' : 'Ideas, recipes and voice memos will show up here.'} action={{ label: 'New Note', onPress: newNote }} /> : <>
      {filtered.some((n) => n.isPinned) && <><SectionHeader title="Pinned" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg }}>{filtered.filter((n) => n.isPinned).map((n) => renderNote(n, true))}</View></>}
      {filtered.some((n) => !n.isPinned) && <><SectionHeader title="Others" /><GroupedList>{filtered.filter((n) => !n.isPinned).map((n) => renderNote(n, false))}</GroupedList></>}
    </>}
    {folderNote && <FormSheet {...folderTransition} title="Move to folder" onClose={() => setFolderNote(null)}><TextField value={folderName} onChangeText={setFolderName} placeholder="Folder name (empty for none)" accessibilityLabel="Folder name" />
      <Button title="Save" onPress={() => { void action(() => setNoteProperty(folderNote.id, 'folder', folderName.trim() || null), () => setFolderNote(null)); }} /></FormSheet>}
  </LargeTitleScreen>;
}
