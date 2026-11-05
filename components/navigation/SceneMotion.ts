import { createContext, useContext } from 'react';
import { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

export type SceneMotion = { offset: SharedValue<number>; opacity: SharedValue<number> };

/** Set by the tab slot; null on screens pushed outside the tabs, which then stay still. */
export const SceneMotionContext = createContext<SceneMotion | null>(null);

/**
 * Styles that carry a tab switch. Only a page's own content uses them: the header actions and
 * the floating add button sit in the same place on every tab, so they must never move.
 */
export function useSceneMotionStyles() {
  const motion = useContext(SceneMotionContext);
  const content = useAnimatedStyle(() => motion ? { opacity: motion.opacity.get(), transform: [{ translateX: motion.offset.get() }] } : {});
  // Sliding the title would run it under the header actions, so it only fades.
  const fade = useAnimatedStyle(() => motion ? { opacity: motion.opacity.get() } : {});
  return { content, fade };
}
