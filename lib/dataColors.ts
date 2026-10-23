import { resolveAccent, type Theme } from '@/constants/theme';

/** Opaque tints remain legible on both light and dark cards, including stored hex colours. */
export function dataColors(theme: Theme, storedColor: string) {
  const resolved = resolveAccent(theme, storedColor);
  const accent = /^#[\da-f]{6}$/i.test(resolved) ? resolved : theme.colors.accent;
  const channels = [1, 3, 5].map((offset) => parseInt(accent.slice(offset, offset + 2), 16) / 255);
  const luminance = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const mix = (amount: number) => {
    const channels = [1, 3, 5].map((offset) => {
      const foreground = parseInt(accent.slice(offset, offset + 2), 16);
      const background = parseInt(theme.colors.card.slice(offset, offset + 2), 16);
      return Math.round(background + (foreground - background) * amount).toString(16).padStart(2, '0');
    });
    return `#${channels.join('')}`;
  };
  return {
    accent, onAccent: luminance > 0.179 ? '#000000' : '#FFFFFF', surface: mix(0.06), tint: mix(0.15), border: mix(0.35),
    heatmap: [mix(0.08), mix(0.3), mix(0.5), mix(0.75), accent] as const,
  };
}
