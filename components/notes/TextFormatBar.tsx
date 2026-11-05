import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { GlassSurface } from '@/components/ui/glass/GlassSurface';
import type { AccentName } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';
import type { FormatColor, FormatToggle } from './richText';

const TOGGLES: { key: FormatToggle; icon: IconName; label: string }[] = [
  { key: 'bold', icon: 'bold', label: 'Bold' }, { key: 'underline', icon: 'underline', label: 'Underline' }, { key: 'strike', icon: 'strikethrough', label: 'Strikethrough' },
];
const SWATCHES: Record<FormatColor, AccentName[]> = {
  highlight: ['yellow', 'green', 'blue', 'pink', 'orange'],
  color: ['red', 'orange', 'green', 'blue', 'purple'],
};

/**
 * Takes the toolbar's place while text is selected. Its buttons sit outside the note's scroll
 * view, so pressing them keeps the keyboard and the selection.
 */
export function TextFormatBar({ active, onToggle, onColor }: {
  /** Which toggles are on for the whole selection. */
  active: Readonly<Record<FormatToggle, boolean>>;
  onToggle: (key: FormatToggle) => void;
  onColor: (key: FormatColor, value: AccentName | null) => void;
}) {
  const theme = useTheme();
  const [palette, setPalette] = useState<FormatColor | null>(null);
  const button = { width: theme.sizes.circleButton, height: theme.sizes.circleButton, borderRadius: theme.radii.pill };
  const swatch = theme.sizes.touchTarget - theme.spacing.sm;
  const barButton = (key: string, icon: IconName, label: string, selected: boolean, onPress: () => void) =>
    <PressableScale key={key} haptic="selection" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress}
      style={[styles.center, button, { backgroundColor: selected ? theme.colors.accentFill : 'transparent' }]}>
      <Icon name={icon} color={selected ? 'accent' : 'label'} />
    </PressableScale>;
  return <View>
    {palette && <GlassSurface sheen radius={theme.radii.card} style={[styles.palette, { left: theme.spacing.md, right: theme.spacing.md, bottom: theme.sizes.toolbarHeight + theme.spacing.sm * 2 }]}
      contentStyle={[styles.row, { padding: theme.spacing.sm, justifyContent: 'space-around' }]}>
      <PressableScale haptic="selection" accessibilityLabel={palette === 'color' ? 'Default text colour' : 'No highlight'} onPress={() => onColor(palette, null)}
        style={[styles.center, { width: swatch, height: swatch }]}><Icon name="none" color="secondaryLabel" /></PressableScale>
      {SWATCHES[palette].map((name) => <PressableScale key={name} haptic="selection" accessibilityLabel={`${palette === 'color' ? 'Text' : 'Highlight'} ${name}`} onPress={() => onColor(palette, name)}
        style={[styles.center, { width: swatch, height: swatch }]}>
        <View style={{ width: swatch - theme.spacing.md, height: swatch - theme.spacing.md, borderRadius: theme.radii.pill, backgroundColor: theme.accents[name] }} />
      </PressableScale>)}
    </GlassSurface>}
    <GlassSurface style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }} contentStyle={[styles.row, { justifyContent: 'space-around', height: theme.sizes.toolbarHeight }]}>
      {TOGGLES.map(({ key, icon, label }) => barButton(key, icon, label, active[key], () => onToggle(key)))}
      {barButton('highlight', 'highlighter', 'Highlight', palette === 'highlight', () => setPalette(palette === 'highlight' ? null : 'highlight'))}
      {barButton('color', 'palette', 'Text colour', palette === 'color', () => setPalette(palette === 'color' ? null : 'color'))}
    </GlassSurface>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  palette: { position: 'absolute' },
});
