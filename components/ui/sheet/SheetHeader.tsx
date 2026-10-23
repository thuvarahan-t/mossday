import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { GlassButton } from '../glass/GlassButton';

export type SheetHeaderProps = {
  title: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

/** Sheet title row: 44 pt side controls with the title centred between them. */
export function SheetHeader({ title, leading, trailing }: SheetHeaderProps) {
  const theme = useTheme();
  const side = { width: theme.sizes.circleButton * 2, minHeight: theme.sizes.circleButton };
  return (
    <View style={[styles.row, { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm }]}>
      <View style={[side, styles.leading]}>{leading}</View>
      <Text variant="headline" align="center" numberOfLines={1} style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <View style={[side, styles.trailing]}>{trailing}</View>
    </View>
  );
}

/** The round glass × / ‹ used on every sheet. */
export function SheetIconButton({ icon, onPress, accessibilityLabel }: {
  icon: 'close' | 'chevronLeft'; onPress: () => void; accessibilityLabel: string;
}) {
  return (
    <GlassButton accessibilityLabel={accessibilityLabel} onPress={onPress} haptic="tap">
      <Icon name={icon} color="label" />
    </GlassButton>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1 },
  leading: { alignItems: 'flex-start', justifyContent: 'center' },
  trailing: { alignItems: 'flex-end', justifyContent: 'center' },
});
