import { Image } from 'expo-image';
import { View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { textVariants } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { dataColors } from '@/lib/dataColors';
import { formatRelativeTimestamp } from '@/lib/date';
import { mediaFile } from '@/lib/media';
import { notePreview, type Note, type NoteBlock } from '@/lib/repos/notes';

const TITLE_LINES = 3;
const PREVIEW_LINES = 6;
/** Photo height as a share of the card's width. */
const PHOTO_RATIO = 0.75;
/** Average glyph widths (pt) for the title and preview text, for height estimates. */
const TITLE_GLYPH = 9;
const PREVIEW_GLYPH = 7.6;
const PADDING = 16;
const GAP = 8;

/** Like iOS Notes: without a heading, the first line of the body becomes the title. */
export function noteSummary(note: Note, blocks: NoteBlock[]) {
  const preview = notePreview(blocks).trim();
  if (note.title.trim()) return { title: note.title.trim(), preview };
  const [first = '', ...rest] = preview.split('\n');
  return { title: first.trim() || 'New note', preview: rest.join(' ').trim() };
}

const lines = (text: string, glyph: number, width: number, max: number) =>
  text ? Math.min(max, Math.max(1, Math.ceil(text.length * glyph / Math.max(1, width)))) : 0;

/**
 * The card's height for the masonry layout, from the same rules the card draws with: photo,
 * title (up to 3 lines), preview (up to 6) and the footer row.
 */
export function estimateNoteHeight(note: Note, blocks: NoteBlock[], width: number) {
  const { title, preview } = noteSummary(note, blocks);
  const inner = width - PADDING * 2;
  const photo = blocks.some((block) => block.type === 'IMAGE' && block.filePath) ? width * PHOTO_RATIO + GAP : 0;
  const titleHeight = lines(title, TITLE_GLYPH, inner, TITLE_LINES) * textVariants.headline.lineHeight;
  const previewHeight = preview ? lines(preview, PREVIEW_GLYPH, inner, PREVIEW_LINES) * textVariants.subheadline.lineHeight + GAP : 0;
  return PADDING * 2 + photo + titleHeight + previewHeight + GAP + textVariants.footnote.lineHeight;
}

/**
 * A note in the masonry grid: an optional photo across the top, the title, a few lines of
 * the body, then when it changed, with marks for voice notes and pinned notes. Coloured
 * notes take their colour's soft fill and border.
 */
export function NoteCard({ note, blocks, width }: { note: Note; blocks: NoteBlock[]; width: number }) {
  const theme = useTheme();
  const { title, preview } = noteSummary(note, blocks);
  const photo = blocks.find((block) => block.type === 'IMAGE' && block.filePath);
  const voice = blocks.some((block) => block.type === 'VOICE');
  const palette = note.color ? dataColors(theme, note.color) : null;
  return <View style={{ padding: PADDING, gap: GAP, borderRadius: theme.radii.card, borderCurve: 'continuous', overflow: 'hidden',
    backgroundColor: palette?.surface ?? theme.colors.card, borderWidth: palette ? 1 : 0, borderColor: palette?.border }}>
    {photo?.filePath && <Image source={{ uri: mediaFile(photo.filePath).uri }} contentFit="cover" transition={150} accessibilityLabel="Note photo"
      style={{ width: width - PADDING * 2, height: width * PHOTO_RATIO, borderRadius: theme.radii.md }} />}
    <Text variant="headline" numberOfLines={TITLE_LINES}>{title}</Text>
    {preview ? <Text variant="subheadline" color="secondaryLabel" numberOfLines={PREVIEW_LINES}>{preview}</Text> : null}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
      <Text variant="footnote" color="tertiaryLabel" style={{ flex: 1 }} numberOfLines={1}>{formatRelativeTimestamp(note.updatedAt)}</Text>
      {voice && <Icon name="mic" size={theme.sizes.iconSmall} color="secondaryLabel" />}
      {note.isPinned ? <Icon name="pin" size={theme.sizes.iconSmall} color="accent" /> : null}
    </View>
  </View>;
}
