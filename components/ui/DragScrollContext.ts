import { createContext } from 'react';
import type Animated from 'react-native-reanimated';
import type { AnimatedRef, SharedValue } from 'react-native-reanimated';

/** The screen's scroll coordinates let a held card reach notes outside the viewport. */
export const DragScrollContext = createContext<{
  ref: AnimatedRef<Animated.ScrollView>;
  offset: SharedValue<number>; top: SharedValue<number>; bottom: SharedValue<number>; max: SharedValue<number>;
} | null>(null);
