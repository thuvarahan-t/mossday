import type { ImageSourcePropType } from 'react-native';

/**
 * Microsoft Fluent Emoji 3D (MIT, see assets/emoji/LICENSE), bundled so every phone shows
 * the same modern emoji instead of the system font's. Apple's own emoji cannot be shipped
 * in an app. Keys omit the U+FE0F variation selector; `emojiAsset` strips it before lookup.
 */
const assets: Record<string, ImageSourcePropType> = {
  '🌱': require('../../assets/emoji/seedling.png'),
  '💧': require('../../assets/emoji/droplet.png'),
  '📖': require('../../assets/emoji/open-book.png'),
  '🏋': require('../../assets/emoji/person-lifting-weights.png'),
  '💻': require('../../assets/emoji/laptop.png'),
  '🧘': require('../../assets/emoji/person-in-lotus-position.png'),
  '🏃': require('../../assets/emoji/person-running.png'),
  '🚶': require('../../assets/emoji/person-walking.png'),
  '🥗': require('../../assets/emoji/green-salad.png'),
  '🍎': require('../../assets/emoji/red-apple.png'),
  '😴': require('../../assets/emoji/sleeping-face.png'),
  '🦷': require('../../assets/emoji/tooth.png'),
  '💊': require('../../assets/emoji/pill.png'),
  '✍': require('../../assets/emoji/writing-hand.png'),
  '🎸': require('../../assets/emoji/guitar.png'),
  '🧹': require('../../assets/emoji/broom.png'),
  '💰': require('../../assets/emoji/money-bag.png'),
  '📵': require('../../assets/emoji/no-mobile-phones.png'),
  '🙏': require('../../assets/emoji/folded-hands.png'),
  '☀': require('../../assets/emoji/sun.png'),
  '😞': require('../../assets/emoji/disappointed-face.png'),
  '😐': require('../../assets/emoji/neutral-face.png'),
  '🙂': require('../../assets/emoji/slightly-smiling-face.png'),
  '😄': require('../../assets/emoji/grinning-face-with-smiling-eyes.png'),
  '🤩': require('../../assets/emoji/star-struck.png'),
};

export const emojiAsset = (emoji: string): ImageSourcePropType | undefined => assets[emoji.replace(/️/g, '')];
