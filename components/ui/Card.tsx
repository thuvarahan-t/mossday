import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export type CardProps = ViewProps & {
  children?: ReactNode;
  /** `content` = 20 pt (hero/content cards), `row` = 16 pt, `none` for lists. */
  padding?: 'none' | 'row' | 'content';
  /** Adds the standard 16 pt screen inset on both sides. */
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** The one card style used on every screen: card fill, 20 pt continuous corners, no border. */
export function Card({ children, padding = 'content', inset = true, style, ...rest }: CardProps) {
  const theme = useTheme();
  const paddingValue = padding === 'content' ? theme.sizes.cardPadding : padding === 'row' ? theme.sizes.rowPadding : 0;
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radii.card,
          borderCurve: 'continuous',
          padding: paddingValue,
          marginHorizontal: inset ? theme.sizes.screenInset : 0,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
