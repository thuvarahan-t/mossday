import { accents, colors, heatmapColors, spendColors } from './colors';
import { radii, sizes, spacing } from './layout';
import { shadows } from './shadows';

export type ColorScheme = 'light' | 'dark';

function buildTheme(scheme: ColorScheme) {
  return {
    scheme,
    isDark: scheme === 'dark',
    colors: colors[scheme],
    accents: accents[scheme],
    heatmap: heatmapColors[scheme],
    spend: spendColors[scheme],
    shadows: shadows[scheme],
    spacing,
    radii,
    sizes,
  } as const;
}

/** Both themes are built once; `useTheme()` just picks one. */
export const themes = { light: buildTheme('light'), dark: buildTheme('dark') } as const;

export type Theme = ReturnType<typeof buildTheme>;
export type ColorToken = keyof Theme['colors'];
