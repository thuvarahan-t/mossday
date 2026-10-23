import { memo } from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import type { ColorToken } from '@/constants/theme';
import { fontFamilies, tabularNums, textVariants, type FontWeight, type TextVariant } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: ColorToken;
  /** Overrides the variant's default weight (e.g. a semibold subheadline). */
  weight?: FontWeight;
  /** Fixed-width digits for amounts, times and counters. */
  tabular?: boolean;
  align?: 'left' | 'center' | 'right';
  strikethrough?: boolean;
};

/** The only text primitive screens may use — every style comes from typography tokens. */
export const Text = memo(function Text({
  variant = 'body', color = 'label', weight, tabular, align, strikethrough, style, ...rest
}: TextProps) {
  const theme = useTheme();
  const { weight: variantWeight, ...metrics } = textVariants[variant];
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      {...rest}
      style={[
        metrics,
        {
          fontFamily: fontFamilies[weight ?? variantWeight],
          color: theme.colors[color],
          fontVariant: tabular ? tabularNums : undefined,
          textAlign: align,
          textDecorationLine: strikethrough ? 'line-through' : undefined,
        },
        style,
      ]}
    />
  );
});
