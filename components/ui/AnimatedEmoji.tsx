import { Image } from 'expo-image';
import { Emoji } from './Emoji';

/**
 * Google's Noto Emoji Animation (CC BY 4.0, see assets/emoji-animated/LICENSE.md), as 144 px
 * looping animated WebP. Only the diary moods are animated.
 */
const animated: Record<string, number> = {
  '😞': require('../../assets/emoji-animated/disappointed-face.webp'),
  '😐': require('../../assets/emoji-animated/neutral-face.webp'),
  '🙂': require('../../assets/emoji-animated/slightly-smiling-face.webp'),
  '😄': require('../../assets/emoji-animated/grinning-face-with-smiling-eyes.webp'),
  '🤩': require('../../assets/emoji-animated/star-struck.webp'),
};

/**
 * Plays the emoji's animation while `playing`; otherwise shows its still poster (the same
 * artwork, from `Emoji`), so a row of them stays calm until one is chosen.
 */
export function AnimatedEmoji({ emoji, size, playing }: { emoji: string; size: number; playing: boolean }) {
  const source = animated[emoji.replace(/\uFE0F/g, '')];
  if (!playing || !source) return <Emoji emoji={emoji} size={size} />;
  return <Image source={source} autoplay transition={0} contentFit="contain" accessible accessibilityLabel={emoji} style={{ width: size, height: size }} />;
}
