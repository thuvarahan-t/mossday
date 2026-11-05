import { Text, type TextStyle } from 'react-native';
import { fontFamilies } from '@/constants/typography';
import { useTheme } from '@/hooks/useTheme';
import { textSegments, type TextSpan } from './richText';

/** Hex alpha that lets text stay readable on its highlight in both light and dark mode. */
const HIGHLIGHT_ALPHA = '66';

/**
 * Formatted text as nested runs, for the inside of a text input or a `Text`. Size and line
 * height come from the parent; the bundled fonts have a separate file per weight, so bold has
 * to change the family rather than set a weight.
 */
export function RichSegments({ text, spans }: { text: string; spans: readonly TextSpan[] }) {
  const theme = useTheme();
  return textSegments(text, spans).map((segment, index) => {
    const { bold, underline, strike, color, highlight } = segment.format;
    const decorations = [underline && 'underline', strike && 'line-through'].filter(Boolean).join(' ') as TextStyle['textDecorationLine'];
    return <Text key={index} style={{
      ...(bold ? { fontFamily: fontFamilies.bold } : {}),
      ...(decorations ? { textDecorationLine: decorations } : {}),
      ...(color ? { color: theme.accents[color] } : {}),
      ...(highlight ? { backgroundColor: `${theme.accents[highlight]}${HIGHLIGHT_ALPHA}` } : {}),
    }}>{segment.text}</Text>;
  });
}
