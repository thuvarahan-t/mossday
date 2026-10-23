import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';

export function Screen({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.sm }}
    >
      <Text accessibilityRole="header"
        style={{ color: theme.colors.text, fontSize: theme.typography.title, fontWeight: '600' }}>
        {title}
      </Text>
    </SafeAreaView>
  );
}
