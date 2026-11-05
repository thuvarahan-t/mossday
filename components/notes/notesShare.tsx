import { Image } from 'expo-image';
import { View } from 'react-native';
import { ShareLine, SHARE_CARD_WIDTH, SharePanel, type ShareContent } from '@/components/share/ShareCard';
import { ShareCheck } from '@/components/share/ShareCheck';
import { checkLine, joinSections } from '@/components/share/shareText';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import type { Theme } from '@/constants/theme';
import { mediaFile } from '@/lib/media';
import { parseBlockLayout, readingOrder } from '@/lib/noteCanvas';
import { checklistItems, type NoteBlock } from '@/lib/repos/notes';
import { parseDrawing } from './drawing';
import { DrawingView } from './DrawingView';
import { notePdfHtml } from './notePdf';
import { RichSegments } from './RichSegments';
import { parseSpans } from './richText';

/** Notes beyond this are summarised so the image stays readable. */
const MAX_NOTES = 8;
/** Long enough for a note's photos to decode before the card is captured. */
const PHOTO_PAINT_MS = 400;

/** Every recording in these blocks, in order: the Audio share option sends only these. */
export const audioPaths = (blocks: readonly NoteBlock[]) =>
  blocks.flatMap((block) => block.type === 'VOICE' && block.filePath ? [block.filePath] : []);

/** Notes tab: titles and first lines, pinned notes first, as listed. */
export function notesShareContent({ theme, notes, audio }: {
  theme: Theme; notes: { id: number; title: string; preview: string; pinned: boolean }[]; audio: string[];
}): ShareContent {
  const hidden = notes.length - MAX_NOTES;
  return {
    icon: 'note',
    title: 'Notes',
    subtitle: notes.length === 1 ? '1 note' : `${notes.length} notes`,
    text: joinSections('Notes', ...notes.map((note) => joinSections(note.title, note.preview).replace('\n\n', '\n'))),
    audio,
    body: <View style={{ gap: theme.spacing.md }}>
      {notes.length > 0 && <SharePanel>
        {notes.slice(0, MAX_NOTES).map((note) => <ShareLine key={note.id} title={note.title} detail={note.preview || undefined}
          leading={note.pinned ? <Icon name="pin" size={theme.sizes.iconSmall} color="accent" /> : undefined} />)}
        {hidden > 0 && <Text variant="footnote" color="secondaryLabel" align="center">+ {hidden} more</Text>}
      </SharePanel>}
    </View>,
  };
}

/** One note as written: its text, lists, photos and drawings, top to bottom. */
export function noteShareContent({ theme, title, blocks }: { theme: Theme; title: string; blocks: readonly NoteBlock[] }): ShareContent {
  const ordered = readingOrder(blocks);
  const heading = title.trim() || 'Note';
  // Card width minus the card's and the panel's horizontal padding.
  const width = SHARE_CARD_WIDTH - theme.spacing.xl * 2 - theme.spacing.lg * 2;
  return {
    icon: 'note',
    title: heading,
    text: joinSections(title.trim(), ...ordered.map((block) => block.type === 'TEXT' ? block.content?.trim()
      : block.type === 'CHECKLIST' ? checklistItems(block.content).map((item) => checkLine(item.text, item.done)).join('\n') : null)),
    audio: audioPaths(ordered),
    pdfHtml: () => notePdfHtml(title, ordered),
    captureDelayMs: ordered.some((block) => block.type === 'IMAGE') ? PHOTO_PAINT_MS : undefined,
    body: <SharePanel>
      {ordered.map((block) => {
        if (block.type === 'TEXT') return block.content?.trim() ? <Text key={block.id}><RichSegments text={block.content} spans={parseSpans(block.spans)} /></Text> : null;
        if (block.type === 'CHECKLIST') return <View key={block.id} style={{ gap: theme.spacing.xs }}>
          {checklistItems(block.content).map((item, index) => <ShareLine key={index} title={item.text} muted={item.done} leading={<ShareCheck done={item.done} />} />)}
        </View>;
        if (block.type === 'IMAGE' && block.filePath) return <Image key={block.id} source={{ uri: mediaFile(block.filePath).uri }} contentFit="contain"
          style={{ width, height: width / (parseBlockLayout(block.layout)?.ratio ?? 4 / 3), borderRadius: theme.radii.md }} />;
        if (block.type === 'DRAWING') return <DrawingView key={block.id} drawing={parseDrawing(block.content)} width={width} />;
        if (block.type === 'VOICE') return <ShareLine key={block.id} title="Voice note" leading={<Icon name="mic" size={theme.sizes.iconSmall} color="accent" />} />;
        return null;
      })}
    </SharePanel>,
  };
}
