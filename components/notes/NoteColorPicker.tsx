import { ScrollView, View } from 'react-native';
import type { AccentName } from '@/constants/colors';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { useTheme } from '@/hooks/useTheme';
import { dataColors } from '@/lib/dataColors';

/** Keep's note colours, as the app's accents; `null` is the plain card. */
export const NOTE_COLORS: readonly AccentName[] = ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'indigo', 'purple', 'pink', 'gray'];
const SWATCH = 40;
const RING = 2.5;

/** A row of note colours, each drawn as the tint the note will get, ringed when chosen. */
export function NoteColorPicker({ color, onChange }: { color: string | null; onChange: (color: string | null) => void }) {
  const theme = useTheme();
  const swatch = (name: AccentName | null) => {
    const selected = color === name;
    const palette = name ? dataColors(theme, name) : null;
    return <PressableScale key={name ?? 'none'} haptic="selection" accessibilityRole="radio" accessibilityState={{ selected }}
      accessibilityLabel={name ?? 'No colour'} onPress={() => onChange(name)}
      style={{ width: SWATCH + RING * 4, height: SWATCH + RING * 4, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.pill,
        borderWidth: RING, borderColor: selected ? palette?.accent ?? theme.colors.accent : 'transparent' }}>
      <View style={{ width: SWATCH, height: SWATCH, borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center',
        backgroundColor: palette?.tint ?? theme.colors.card, borderWidth: 1, borderColor: palette?.border ?? theme.colors.separator }}>
        {!name && <Icon name="none" size={theme.sizes.iconSmall} color="secondaryLabel" />}
      </View>
    </PressableScale>;
  };
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} accessibilityRole="radiogroup"
    contentContainerStyle={{ gap: theme.spacing.xs }}>
    {swatch(null)}
    {NOTE_COLORS.map(swatch)}
  </ScrollView>;
}
