import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';

export function Screen({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: theme.colors.groupedBackground, paddingHorizontal: theme.sizes.titleInset }}
    >
      <Text variant="largeTitle" accessibilityRole="header">{title}</Text>
    </SafeAreaView>
  );
}
