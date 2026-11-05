import { type ScrollViewProps } from 'react-native';
import Animated, { useAnimatedRef, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useWindowTopOffset } from '@/hooks/useWindowTopOffset';
import { DragScrollContext } from './DragScrollContext';

/** Exposes viewport coordinates for UI-thread edge scrolling while a child owns a drag. */
export function DragScrollView({ children, ...props }: ScrollViewProps) {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(0);
  const top = useSharedValue(0);
  const bottom = useSharedValue(0);
  const max = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const windowTop = useWindowTopOffset();
  const onScroll = useAnimatedScrollHandler((event) => { offset.set(event.contentOffset.y); });
  return <Animated.ScrollView {...props} ref={ref} onScroll={onScroll} scrollEventThrottle={16}
    onLayout={(event) => {
      viewportHeight.set(event.nativeEvent.layout.height);
      max.set(Math.max(0, contentHeight.get() - viewportHeight.get()));
      ref.current?.measureInWindow((_x, y, _width, height) => { top.set(y + windowTop); bottom.set(y + windowTop + height); });
    }} onContentSizeChange={(_width, height) => { contentHeight.set(height); max.set(Math.max(0, height - viewportHeight.get())); }}>
    <DragScrollContext.Provider value={{ ref, offset, top, bottom, max }}>{children}</DragScrollContext.Provider>
  </Animated.ScrollView>;
}
