import type { TextStyle } from 'react-native';

/**
 * iOS type scale set in Inter (SF Pro substitute). Android ignores `fontWeight` for custom
 * fonts, so every weight maps to its own font family. Large sizes get negative tracking
 * so Inter sits as tight as SF Pro Display.
 */
export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export type FontWeight = keyof typeof fontFamilies;

type Variant = Required<Pick<TextStyle, 'fontSize' | 'lineHeight' | 'letterSpacing'>> & { weight: FontWeight };

export const textVariants = {
  /** Amount being typed in the Add Expense sheet, habit streak hero. */
  display: { fontSize: 64, lineHeight: 72, letterSpacing: -2, weight: 'bold' },
  /** "The one number" on Today / Expenses. */
  hero: { fontSize: 48, lineHeight: 56, letterSpacing: -1.4, weight: 'bold' },
  largeTitle: { fontSize: 34, lineHeight: 41, letterSpacing: -0.8, weight: 'bold' },
  title1: { fontSize: 28, lineHeight: 34, letterSpacing: -0.6, weight: 'bold' },
  title2: { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, weight: 'bold' },
  title3: { fontSize: 20, lineHeight: 25, letterSpacing: -0.3, weight: 'semibold' },
  headline: { fontSize: 17, lineHeight: 22, letterSpacing: -0.25, weight: 'semibold' },
  body: { fontSize: 17, lineHeight: 22, letterSpacing: -0.25, weight: 'regular' },
  callout: { fontSize: 16, lineHeight: 21, letterSpacing: -0.2, weight: 'regular' },
  subheadline: { fontSize: 15, lineHeight: 20, letterSpacing: -0.1, weight: 'regular' },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: 0, weight: 'regular' },
  caption1: { fontSize: 12, lineHeight: 16, letterSpacing: 0, weight: 'regular' },
  caption2: { fontSize: 11, lineHeight: 13, letterSpacing: 0.05, weight: 'regular' },
} as const satisfies Record<string, Variant>;

export type TextVariant = keyof typeof textVariants;

/** Amounts and counters keep a fixed digit width so rolling numbers don't jitter. */
export const tabularNums: TextStyle['fontVariant'] = ['tabular-nums'];
