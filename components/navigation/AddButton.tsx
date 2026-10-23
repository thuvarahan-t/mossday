import { Icon } from '@/components/ui/Icon';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { useTheme } from '@/hooks/useTheme';

/** Glass "+" beside a tab's large title: that tab's primary add action (spec §4). */
export function AddButton({ onPress, accessibilityLabel }: { onPress: () => void; accessibilityLabel: string }) {
  const theme = useTheme();
  return (
    <GlassButton accessibilityLabel={accessibilityLabel} haptic="tap" onPress={onPress}>
      <Icon name="plus" size={theme.sizes.iconLarge} color="accent" strokeWidth={2.6} />
    </GlassButton>
  );
}
