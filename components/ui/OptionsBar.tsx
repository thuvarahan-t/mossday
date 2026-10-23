import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type OptionCell = {
  label: string;
  onPress: () => void;
  /** Green text for actions ("Add note") rather than values ("Today", "Cash"). */
  tinted?: boolean;
  accessibilityLabel?: string;
};

/**
 * The "Today | Cash | Add note" bar: equal cells on a grey rounded bar split by hairlines.
 * The date cell is the app's DatePill.
 */
export function OptionsBar({ cells }: { cells: OptionCell[] }) {
  const theme = useTheme();
  return (
    <View style={[styles.bar, {
      height: theme.sizes.touchTarget, borderRadius: theme.radii.lg, backgroundColor: theme.colors.fill,
      marginHorizontal: theme.sizes.screenInset,
    }]}>
      {cells.map((cell, index) => (
        <Fragment key={cell.label + index}>
          {index > 0 && <View style={{ width: theme.sizes.hairline * 2, height: theme.spacing.xxl, backgroundColor: theme.colors.separator }} />}
          <PressableScale haptic="selection" style={[styles.cell, { paddingHorizontal: theme.spacing.xs }]} onPress={cell.onPress} accessibilityLabel={cell.accessibilityLabel ?? cell.label}>
            <Text color={cell.tinted ? 'accent' : 'label'} numberOfLines={1}>{cell.label}</Text>
          </PressableScale>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', borderCurve: 'continuous' },
  cell: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
});
