import { useColorScheme } from 'react-native';
import { themes, type Theme } from '@/constants/theme';

/** Follows the system theme; the Appearance setting overrides it via `Appearance.setColorScheme`. */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? themes.dark : themes.light;
}
