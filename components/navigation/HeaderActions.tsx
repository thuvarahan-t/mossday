import { StyleSheet } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { GlassSurface } from '@/components/ui/glass/GlassSurface';
import { useTheme } from '@/hooks/useTheme';

export type HeaderAction = {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** The screen's main action ("+"), drawn in the accent green. */
  primary?: boolean;
};

/**
 * One glass pill of icon buttons beside a large title (share, settings, add). Grouping them
 * keeps three actions narrower than three separate circles, so titles never wrap.
 */
export function HeaderActions({ actions }: { actions: HeaderAction[] }) {
  const theme = useTheme();
  return (
    <GlassSurface contentStyle={[styles.row, { height: theme.sizes.circleButton, paddingHorizontal: theme.spacing.xs }]}>
      {actions.map((action) => (
        <PressableScale key={action.label} haptic="tap" accessibilityLabel={action.label} onPress={action.onPress} hitSlop={theme.spacing.xs}
          style={[styles.center, { width: theme.sizes.headerAction, height: theme.sizes.circleButton }]}>
          <Icon name={action.icon} color={action.primary ? 'accent' : 'label'} strokeWidth={action.primary ? 2.6 : 2}
            size={action.primary ? theme.sizes.iconLarge : theme.sizes.icon} />
        </PressableScale>
      ))}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
