import { View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AnimatedListItem } from './AnimatedListItem';
import { IconTile } from './IconTile';
import type { IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type CategoryGridItem = { id: number; name: string; icon: IconName; color: string };

/** Three-column category tiles, including a dedicated create action. */
export function CategoryGrid({ items, selected, onSelect, onCreate }: {
  items: CategoryGridItem[]; selected: number | null; onSelect: (id: number) => void; onCreate: () => void;
}) {
  const theme = useTheme();
  const tileStyle = {
    minHeight: theme.sizes.fieldHeight * 2, borderRadius: theme.radii.xl,
    padding: theme.spacing.md, gap: theme.spacing.sm, alignItems: 'center' as const, justifyContent: 'center' as const,
  };
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.spacing.md }}>
    {items.map((item) => <AnimatedListItem key={item.id} style={{ width: '30%' }}>
      <PressableScale haptic="selection" onPress={() => onSelect(item.id)} accessibilityLabel={item.name} accessibilityState={{ selected: item.id === selected }}
        style={[tileStyle, { backgroundColor: item.id === selected ? theme.colors.accentFill : theme.colors.card }]}>
        <IconTile icon={item.icon} color={item.color} size={theme.sizes.iconTileLarge} />
        <Text variant="subheadline" align="center" numberOfLines={2}>{item.name}</Text>
      </PressableScale>
    </AnimatedListItem>)}
    <AnimatedListItem style={{ width: '30%' }}><PressableScale accessibilityLabel="New category" haptic="tap" onPress={onCreate} style={[tileStyle, { backgroundColor: theme.colors.card }]}>
      <IconTile icon="plus" color="gray" neutral size={theme.sizes.iconTileLarge} /><Text variant="subheadline">New</Text>
    </PressableScale></AnimatedListItem>
  </View>;
}
