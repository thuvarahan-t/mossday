import { View } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';

/**
 * Keep's small label pill for a note's reminder or folder; struck through once a reminder
 * has passed. Pressable when given `onPress`.
 */
export function NoteTag({ icon, label, onPress, past }: { icon: IconName; label: string; onPress?: () => void; past?: boolean }) {
  const theme = useTheme();
  const body = <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs, borderRadius: theme.radii.pill, backgroundColor: theme.colors.fill, alignSelf: 'flex-start' }}>
    <Icon name={icon} size={theme.sizes.iconSmall - 3} color="secondaryLabel" />
    <Text variant="caption1" color="secondaryLabel" numberOfLines={1} style={past ? { textDecorationLine: 'line-through' } : undefined}>{label}</Text>
  </View>;
  return onPress ? <PressableScale haptic="tap" accessibilityLabel={label} onPress={onPress}>{body}</PressableScale> : body;
}
