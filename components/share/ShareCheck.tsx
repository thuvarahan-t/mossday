import { View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';

/** Static to-do circle for shared images: filled green check when done, empty ring otherwise. */
export function ShareCheck({ done }: { done: boolean }) {
  const theme = useTheme();
  const size = theme.sizes.checkbox;
  return <View style={{
    width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: done ? theme.colors.accent : 'transparent', borderWidth: done ? 0 : 1.5, borderColor: theme.colors.tertiaryLabel,
  }}>
    {done && <Icon name="check" size={size * 0.6} color="onAccent" strokeWidth={3} />}
  </View>;
}
