import { useSharedValue } from 'react-native-reanimated';
import { useTabBarBottom } from '@/hooks/useTabBarInset';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { GlassSurface } from '@/components/ui/glass/GlassSurface';

export type FloatingAddAction = { label: string; onPress: () => void };
export const FLOATING_ADD_SIZE = 56;

/**
 * Fixed above the rightmost tab, within thumb reach and clear of the tab bar. Liquid glass like
 * the tab bar beneath it, with a green tint so it still reads as the page's main action.
 */
export function FloatingAddButton({ label, onPress }: FloatingAddAction) {
  const theme = useTheme();
  const bottom = useTabBarBottom() + theme.sizes.tabBarHeight + theme.spacing.md;
  const pressed = useSharedValue(0);
  return <PressableScale accessibilityLabel={label} haptic="tap" onPress={onPress} pressProgress={pressed}
    style={{ position: 'absolute', right: theme.sizes.screenInset, bottom, width: FLOATING_ADD_SIZE, height: FLOATING_ADD_SIZE }}>
    <GlassSurface sheen pressProgress={pressed} radius={FLOATING_ADD_SIZE / 2}
      contentStyle={{ width: FLOATING_ADD_SIZE, height: FLOATING_ADD_SIZE, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentFill }}>
      <Icon name="plus" color="accent" size={28} strokeWidth={2.6} />
    </GlassSurface>
  </PressableScale>;
}
