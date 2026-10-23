import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type EmptyStateProps = {
  icon: IconName;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
};

/** Centred icon, bold title and one-line hint (design "M · Empty …" screens). */
export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn} style={[styles.container, { paddingHorizontal: theme.spacing.xxxl, paddingVertical: theme.spacing.xl, gap: theme.spacing.lg }]}>
      <Icon name={icon} size={theme.sizes.iconEmpty} color="secondaryLabel" strokeWidth={1.8} />
      <View style={{ gap: theme.spacing.xs, maxWidth: theme.sizes.emptyStateMaxWidth }}>
        <Text variant="title3" weight="bold" align="center">{title}</Text>
        <Text color="secondaryLabel" align="center">{message}</Text>
      </View>
      {action && <Button title={action.label} onPress={action.onPress} style={{ marginTop: theme.spacing.xs }} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
