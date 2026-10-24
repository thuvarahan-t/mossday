import { Image } from 'react-native';
import { emojiAsset } from './emojiAssets';
import { Text } from './Text';

/**
 * An emoji drawn from the bundled Fluent 3D set, `size` points square. Emoji outside the
 * set (for example, typed ones in older data) fall back to the system font at that size.
 */
export function Emoji({ emoji, size }: { emoji: string; size: number }) {
  const source = emojiAsset(emoji);
  // No Android fade-in, so share images captured right after layout show the whole emoji.
  if (source) return <Image source={source} fadeDuration={0} accessible accessibilityLabel={emoji} style={{ width: size, height: size }} />;
  return <Text style={{ fontSize: size * 0.85, lineHeight: size }}>{emoji}</Text>;
}
