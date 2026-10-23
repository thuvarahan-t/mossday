import { useColorScheme } from 'react-native';
import { colors, heatmapColors, moduleColors, radii, spacing, typography } from '@/constants/theme';

export function useTheme() {
  const mode = useColorScheme() === 'dark' ? 'dark' : 'light';
  return {
    mode, isDark: mode === 'dark', colors: colors[mode], heatmap: heatmapColors[mode],
    moduleColors, radii, spacing, typography,
  };
}
