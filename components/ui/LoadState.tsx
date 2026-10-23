import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';
import { Button } from './Button';

/** Local reads finish in milliseconds; a spinner only appears if one is genuinely slow. */
const SPINNER_DELAY = 400;

export function LoadState({ error, retry }: { error: string | null; retry: () => void }) {
  const theme = useTheme();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SPINNER_DELAY);
    return () => clearTimeout(timer);
  }, []);
  return <View style={{ padding: theme.spacing.xxxl, gap: theme.spacing.lg, alignItems: 'center' }}>
    {error ? <><Text accessibilityRole="alert" align="center">{error}</Text><Button title="Try again" onPress={retry} /></>
      : slow && <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading" />}
  </View>;
}
