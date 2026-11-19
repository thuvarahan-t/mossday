import { Column, LazyColumn, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, padding, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { NotesSnapshot } from './NotesWidget';

function NotesWidget({ count = 0, notes = [] }: NotesSnapshot, environment: WidgetEnvironment) {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const ink = dark ? '#F1F7EE' : '#142D22';
  const accent = dark ? '#A1D8AE' : '#286345';

  return <Column modifiers={[fillMaxSize(), cornerRadius(22), background(dark ? '#152A20' : '#EAF4E9'), paddingAll(14)]}>
    <Text maxLines={1} color={ink} style={{ fontSize: 18, fontWeight: 'bold' }}>Notes</Text>
    <Text maxLines={1} color={accent} style={{ fontSize: 12 }} modifiers={[padding(0, 2, 0, 6)]}>
      {count === 1 ? '1 note' : `${count} notes`}
    </Text>
    {notes.length === 0
      ? <Text color={accent} style={{ fontSize: 13 }}>No notes yet</Text>
      : <LazyColumn>{notes.map((note) => <Text key={note.id} maxLines={1} overflow="ellipsis"
        modifiers={[padding(0, 3, 0, 3)]} color={ink} style={{ fontSize: 14 }}>
        {`${note.pinned ? '\u2022  ' : ''}${note.title}`}
      </Text>)}</LazyColumn>}
  </Column>;
}

export default createWidget<NotesSnapshot>('MossdayNotes', NotesWidget, { count: 0, notes: [] });
