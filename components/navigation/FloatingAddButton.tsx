import { useTabBarBottom } from '@/hooks/useTabBarInset';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';

export type FloatingAddAction = { label: string; onPress: () => void };
export const FLOATING_ADD_SIZE = 56;

/** Fixed above the rightmost tab, within thumb reach and clear of the tab bar. */
export function FloatingAddButton({ label, onPress }: FloatingAddAction) {
  const theme = useTheme();
  const bottom = useTabBarBottom() + theme.sizes.tabBarHeight + theme.spacing.md;
  return <PressableScale accessibilityLabel={label} haptic="tap" onPress={onPress}
    style={{ position: 'absolute', right: theme.sizes.screenInset, bottom, width: FLOATING_ADD_SIZE, height: FLOATING_ADD_SIZE,
      borderRadius: FLOATING_ADD_SIZE / 2, backgroundColor: theme.colors.accent, boxShadow: theme.shadows.raised,
      alignItems: 'center', justifyContent: 'center' }}>
    <Icon name="plus" color="onAccent" size={28} strokeWidth={2.6} />
  </PressableScale>;
}
