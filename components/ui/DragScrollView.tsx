import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { Keyboard, TextInput, type ScrollViewProps } from 'react-native';
import Animated, { useAnimatedRef, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useWindowTopOffset } from '@/hooks/useWindowTopOffset';
import { DragScrollContext } from './DragScrollContext';

/** Room kept below the cursor's line, so it never touches what is under the page. */
const CARET_MARGIN = 48;

/** Scrolls the focused text's cursor into view. `atEnd`: it is on the text's last line. */
export type RevealCaret = (atEnd?: boolean) => void;

/**
 * Exposes viewport coordinates for UI-thread edge scrolling while a child owns a drag, and
 * keeps the cursor above the keyboard. Text inputs do not report where their cursor is drawn,
 * but it lands where the finger touched, so that point stands in for it inside a long block.
 */
export function DragScrollView({ children, revealCaret, onTouchStart, ...props }: ScrollViewProps & { revealCaret?: Ref<RevealCaret> }) {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(0);
  const top = useSharedValue(0);
  const bottom = useSharedValue(0);
  const max = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const windowTop = useWindowTopOffset();
  // In content coordinates, so it stays correct while a reveal is already scrolling.
  const touchInContent = useRef<number | null>(null);
  const reveal = useCallback((viewportLimit: number, atEnd: boolean) => {
    TextInput.State.currentlyFocusedInput?.()?.measureInWindow((_x, inputY, _inputWidth, inputHeight) => {
      ref.current?.measureInWindow((_viewX, viewY, _viewWidth, viewHeight) => {
        const touch = touchInContent.current === null ? null : touchInContent.current - offset.get();
        const caret = !atEnd && touch !== null && touch >= inputY && touch <= inputY + inputHeight ? touch : inputY + inputHeight;
        const overlap = caret + CARET_MARGIN - Math.min(viewY + viewHeight, viewportLimit);
        if (overlap > 0) ref.current?.scrollTo({ y: offset.get() + overlap, animated: true });
      });
    });
  }, [offset, ref]);
  useImperativeHandle(revealCaret, () => (atEnd = false) => reveal(Infinity, atEnd), [reveal]);
  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', (event) => reveal(event.endCoordinates.screenY - windowTop, false));
    return () => subscription.remove();
  }, [reveal, windowTop]);
  const onScroll = useAnimatedScrollHandler((event) => { offset.set(event.contentOffset.y); });
  return <Animated.ScrollView {...props} ref={ref} onScroll={onScroll} scrollEventThrottle={16}
    onTouchStart={(event) => { touchInContent.current = event.nativeEvent.pageY + offset.get(); onTouchStart?.(event); }}
    onLayout={(event) => {
      const { height } = event.nativeEvent.layout;
      // The page shrinks as the keyboard arrives, possibly after keyboardDidShow.
      const shrank = height < viewportHeight.get();
      viewportHeight.set(height);
      max.set(Math.max(0, contentHeight.get() - viewportHeight.get()));
      ref.current?.measureInWindow((_x, y, _width, measuredHeight) => { top.set(y + windowTop); bottom.set(y + windowTop + measuredHeight); });
      if (shrank) reveal(Infinity, false);
    }} onContentSizeChange={(_width, height) => { contentHeight.set(height); max.set(Math.max(0, height - viewportHeight.get())); }}>
    <DragScrollContext.Provider value={{ ref, offset, top, bottom, max }}>{children}</DragScrollContext.Provider>
  </Animated.ScrollView>;
}
