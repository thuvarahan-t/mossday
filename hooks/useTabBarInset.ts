import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './useTheme';

/** Distance from the screen bottom to the tab bar's bottom edge. */
export function useTabBarBottom() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return Math.max(insets.bottom, theme.spacing.lg);
}

/** Bottom padding for tab-screen scroll content so the last card clears the floating bar. */
export function useTabBarInset() {
  const theme = useTheme();
  return useTabBarBottom() + theme.sizes.tabBarHeight + theme.spacing.xxl;
}
