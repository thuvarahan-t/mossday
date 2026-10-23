import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { themes, type ColorScheme, type Theme } from '@/constants/theme';

/**
 * Forces a colour scheme for a subtree. Only the dev component gallery uses it, to show
 * light and dark side by side; the app itself always follows the system/Appearance setting.
 */
export const ColorSchemeOverride = createContext<ColorScheme | null>(null);

/** Follows the system theme; the Appearance setting overrides it via `Appearance.setColorScheme`. */
export function useTheme(): Theme {
  const system = useColorScheme();
  const override = useContext(ColorSchemeOverride);
  return (override ?? system) === 'dark' ? themes.dark : themes.light;
}
