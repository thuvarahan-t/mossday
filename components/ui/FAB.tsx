import { useTheme } from '@/hooks/useTheme';
import { Icon } from './Icon';
import { GlassButton } from './glass/GlassButton';

/** Glass "+" that sits beside the tab bar (same height as the bar). */
export function FAB({ onPress, accessibilityLabel = 'Add' }: { onPress: () => void; accessibilityLabel?: string }) {
  const theme = useTheme();
  return (
    <GlassButton size={theme.sizes.fab} accessibilityLabel={accessibilityLabel} haptic="tap" onPress={onPress}>
      <Icon name="plus" size={theme.sizes.iconLarge + 6} color="accent" strokeWidth={2.4} />
    </GlassButton>
  );
}
