import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { ColorToken } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { haptics } from '@/lib/haptics';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type ButtonProps = {
  title: string;
  onPress: () => void;
  /** filled = green with white text, tinted = soft green, plain = text only. */
  variant?: 'filled' | 'tinted' | 'plain';
  /** large = 52 pt (Save), small = 36 pt (Add, Edit). */
  size?: 'large' | 'small';
  fullWidth?: boolean;
  disabled?: boolean;
  haptic?: keyof typeof haptics;
  style?: StyleProp<ViewStyle>;
};

const TEXT_COLOR: Record<NonNullable<ButtonProps['variant']>, ColorToken> = {
  filled: 'onAccent', tinted: 'accent', plain: 'accent',
};

export function Button({
  title, onPress, variant = 'filled', size = 'large', fullWidth, disabled, haptic = 'tap', style,
}: ButtonProps) {
  const theme = useTheme();
  const background = variant === 'filled' ? theme.colors.accent : variant === 'tinted' ? theme.colors.accentFill : 'transparent';
  const height = size === 'large' ? theme.sizes.buttonHeight : theme.sizes.touchTarget;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      haptic={disabled ? undefined : haptic}
      accessibilityLabel={title}
      style={[
        styles.base,
        {
          height,
          paddingHorizontal: variant === 'plain' ? 0 : size === 'large' ? theme.spacing.xxxl : theme.spacing.lg,
          borderRadius: theme.radii.pill,
          backgroundColor: background,
          opacity: disabled ? 0.4 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      <Text variant={size === 'large' ? 'headline' : 'body'} weight={variant === 'plain' ? 'regular' : 'semibold'} color={TEXT_COLOR[variant]}>
        {title}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({ base: { alignItems: 'center', justifyContent: 'center' } });
