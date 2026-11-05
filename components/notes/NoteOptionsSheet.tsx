import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { FormSheet, type FormSheetTransition } from '@/components/ui/FormSheet';
import { GroupedList, ListRow } from '@/components/ui/GroupedList';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useTheme } from '@/hooks/useTheme';
import { formatTimestamp } from '@/lib/date';
import { NoteColorPicker } from './NoteColorPicker';

export type NoteOptions = {
  color: string | null; folder: string | null; folders: string[]; archived: boolean;
  counts: { words: number; characters: number }; createdAt: string; updatedAt: string;
};

/**
 * The note's ⋮ menu: colour and folder (Keep), copy, archive and delete, and
 * Samsung's note info, when it was made and changed and how long it is.
 */
export function NoteOptionsSheet({ options, onColor, onFolder, onCopy, onArchive, onDelete, onClose, ...transition }: {
  options: NoteOptions; onColor: (color: string | null) => void; onFolder: (folder: string | null) => void;
  onCopy: () => void; onArchive: () => void; onDelete: () => void; onClose: () => void;
} & Partial<FormSheetTransition>) {
  const theme = useTheme();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const { color, folder, folders, archived, counts } = options;
  const addFolder = () => { if (!name.trim()) return; onFolder(name.trim()); setNaming(false); setName(''); };
  return <FormSheet size="fit" dense {...transition} title="Note" onClose={onClose}>
    <Text variant="footnote" color="secondaryLabel">COLOUR</Text>
    <NoteColorPicker color={color} onChange={onColor} />
    <Text variant="footnote" color="secondaryLabel">FOLDER</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: theme.spacing.sm }}>
      <Chip label="None" size="small" selected={!folder} onPress={() => onFolder(null)} />
      {/* A folder typed here before it was saved is shown too, so the choice is visible at once. */}
      {[...new Set([...folders, ...folder ? [folder] : []])].map((item) => <Chip key={item} label={item} size="small" selected={folder === item} onPress={() => onFolder(item)} />)}
      <Chip label="+ New" size="small" selected={false} onPress={() => setNaming(true)} />
    </ScrollView>
    {naming && <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <View style={{ flex: 1 }}><TextField value={name} onChangeText={setName} placeholder="Folder name" accessibilityLabel="New folder name" autoFocus
        returnKeyType="done" onSubmitEditing={addFolder} /></View>
      <Button title="Add" size="small" disabled={!name.trim()} onPress={addFolder} />
    </View>}
    <GroupedList style={{ marginHorizontal: 0 }}>
      <ListRow title="Make a copy" icon={{ icon: 'copy', color: 'teal' }} onPress={onCopy} />
      <ListRow title={archived ? 'Unarchive' : 'Archive'} icon={{ icon: archived ? 'unarchive' : 'archive', color: 'indigo' }} onPress={onArchive} />
      <ListRow title="Delete note" icon={{ icon: 'trash', color: 'red' }} onPress={onDelete} />
    </GroupedList>
    <Text variant="footnote" color="secondaryLabel" align="center">
      {`${counts.words} ${counts.words === 1 ? 'word' : 'words'} · ${counts.characters} ${counts.characters === 1 ? 'character' : 'characters'}\nCreated ${formatTimestamp(options.createdAt)} · Edited ${formatTimestamp(options.updatedAt)}`}
    </Text>
  </FormSheet>;
}
