import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type EmptyStateProps = {
  icon: IconName;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
  /** Makes the whole empty area a tap target ("No expenses today · Tap to add one"). */
  onPress?: () => void;
};

/** Centred icon, bold title and one-line hint (design "M · Empty …" screens). */
export function EmptyState({ icon, title, message, action, onPress }: EmptyStateProps) {
  const theme = useTheme();
  const body = (
    <Animated.View entering={FadeIn} style={[styles.container, { padding: theme.spacing.xxxl, gap: theme.spacing.lg }]}>
      <Icon name={icon} size={theme.sizes.iconEmpty} color="secondaryLabel" strokeWidth={1.8} />
      <View style={{ gap: theme.spacing.xs, maxWidth: theme.sizes.emptyStateMaxWidth }}>
        <Text variant="title3" weight="bold" align="center">{title}</Text>
        <Text color="secondaryLabel" align="center">{message}</Text>
      </View>
      {action && <Button title={action.label} onPress={action.onPress} style={{ marginTop: theme.spacing.xs }} />}
    </Animated.View>
  );
  if (!onPress) return body;
  return <PressableScale haptic="tap" accessibilityLabel={`${title}. ${message}`} onPress={onPress} style={styles.pressable}>{body}</PressableScale>;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressable: { flex: 1 },
});
