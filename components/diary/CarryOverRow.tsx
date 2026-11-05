import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useAction } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { addDays } from '@/lib/date';
import { moveIncomplete } from '@/lib/repos/diary';

/** The first row of a day's to-dos when the day before left some unfinished. */
export function CarryOverRow({ count, date, today }: { count: number; date: string; today: string }) {
  const theme = useTheme();
  const action = useAction();
  const isToday = date === today;
  return <View key="carry-over" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: theme.sizes.rowMinHeight, paddingHorizontal: theme.sizes.rowPadding }}>
    <Text variant="subheadline" color="secondaryLabel">{count} left from {isToday ? 'yesterday' : 'the day before'}</Text>
    <Button title={isToday ? 'Move to Today' : 'Move here'} variant="plain" size="small" onPress={() => { void action(() => moveIncomplete(addDays(date, -1), date)); }} />
  </View>;
}
