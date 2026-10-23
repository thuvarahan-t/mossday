import { View } from 'react-native';
import { ShareLine, SharePanel, type ShareCardContent } from '@/components/share/ShareCard';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import type { Theme } from '@/constants/theme';

/** Notes beyond this are summarised so the image stays readable. */
const MAX_NOTES = 8;

/** Notes tab as an image: titles and first lines, pinned notes first, as listed. */
export function notesShareContent({ theme, notes }: {
  theme: Theme; notes: { id: number; title: string; preview: string; pinned: boolean }[];
}): ShareCardContent {
  const hidden = notes.length - MAX_NOTES;
  return {
    icon: 'note',
    title: 'Notes',
    subtitle: notes.length === 1 ? '1 note' : `${notes.length} notes`,
    body: <View style={{ gap: theme.spacing.md }}>
      {notes.length > 0 && <SharePanel>
        {notes.slice(0, MAX_NOTES).map((note) => <ShareLine key={note.id} title={note.title} detail={note.preview || undefined}
          leading={note.pinned ? <Icon name="pin" size={theme.sizes.iconSmall} color="accent" /> : undefined} />)}
        {hidden > 0 && <Text variant="footnote" color="secondaryLabel" align="center">+ {hidden} more</Text>}
      </SharePanel>}
    </View>,
  };
}
