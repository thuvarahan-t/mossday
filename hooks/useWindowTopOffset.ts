import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Distance from the top of the screen to the top of the app window. On Android outside
 * edge-to-edge (e.g. Expo Go) the window starts below the status bar, so window coordinates
 * must be shifted when compared with screen coordinates (keyboard frame, full-screen modals).
 */
export function useWindowTopOffset(): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'android' ? Math.max(0, (StatusBar.currentHeight ?? 0) - insets.top) : 0;
}
