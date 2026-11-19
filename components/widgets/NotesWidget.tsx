import { HStack, Link, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, frame, lineLimit, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type NotesSnapshot = { count: number; notes: { id: number; title: string; pinned: boolean }[] };

function NotesWidget({ count = 0, notes = [] }: NotesSnapshot, environment: WidgetEnvironment) {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const ink = dark ? '#F1F7EE' : '#142D22';
  const accent = dark ? '#A1D8AE' : '#286345';
  const large = environment.widgetFamily === 'systemLarge';
  const compact = environment.widgetFamily === 'systemSmall';
  const visible = notes.slice(0, large ? 7 : compact ? 2 : 3);
  return <VStack alignment="leading" spacing={large ? 12 : 6} modifiers={[
    frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
    containerBackground(dark ? '#152A20' : '#EAF4E9', 'widget'), widgetURL('mossday:///notes'),
  ]}>
    <HStack>
      <Text modifiers={[font({ size: 19, weight: 'bold' }), foregroundStyle(ink)]}>Notes</Text>
      <Spacer />
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(accent)]}>{String(count)}</Text>
    </HStack>
    {visible.length === 0 && <Text modifiers={[foregroundStyle(accent), font({ size: 13 })]}>No notes yet</Text>}
    {visible.map((note) => <Link key={note.id} destination={`mossday:///note/${note.id}`}>
      <Text modifiers={[lineLimit(1), foregroundStyle(ink), font({ size: 14, weight: 'medium' })]}>
        {`${note.pinned ? '•  ' : ''}${note.title}`}
      </Text>
    </Link>)}
    <Spacer minLength={0} />
    <Link label="All notes →" destination="mossday:///notes" modifiers={[foregroundStyle(accent), font({ size: 12, weight: 'semibold' })]} />
  </VStack>;
}

export default createWidget<NotesSnapshot>('MossdayNotes', NotesWidget, { count: 0, notes: [] });
