import { createContext, useContext, useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';
import { themes, type ColorScheme, type Theme } from '@/constants/theme';
import { getAppearancePreference, subscribeAppearance } from '@/lib/appearance';

/**
 * Forces a colour scheme for a subtree. Only the dev component gallery uses it, to show
 * light and dark side by side; the app itself always follows the system/Appearance setting.
 */
export const ColorSchemeOverride = createContext<ColorScheme | null>(null);

/** Follows the system theme; the Appearance setting overrides it via `Appearance.setColorScheme`. */
export function useTheme(): Theme {
  const system = useColorScheme();
  const override = useContext(ColorSchemeOverride);
  const preference = useSyncExternalStore(subscribeAppearance, getAppearancePreference, getAppearancePreference);
  return (override ?? (preference === 'system' ? system : preference)) === 'dark' ? themes.dark : themes.light;
}
