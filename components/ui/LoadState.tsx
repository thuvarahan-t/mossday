import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';
import { Button } from './Button';

export function LoadState({ error, retry }: { error: string | null; retry: () => void }) {
  const theme = useTheme();
  return <View style={{ padding: theme.spacing.xxxl, gap: theme.spacing.lg, alignItems: 'center' }}>
    {error ? <><Text accessibilityRole="alert" align="center">{error}</Text><Button title="Try again" onPress={retry} /></>
      : <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading" />}
  </View>;
}
