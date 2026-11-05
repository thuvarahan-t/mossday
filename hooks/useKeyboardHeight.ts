import { useEffect } from 'react';
import { Keyboard } from 'react-native';
import { KeyboardState, useAnimatedKeyboard, useDerivedValue, useSharedValue } from 'react-native-reanimated';

/**
 * The keyboard's height, following its animation frame by frame. The animated value alone can
 * stay at its open height after the keyboard is closed with Android's back button, which left
 * the note toolbar floating and blank space under pages, so the keyboard's own hide event
 * overrides it until the keyboard actually opens again.
 */
export function useKeyboardHeight() {
  const keyboard = useAnimatedKeyboard();
  const hidden = useSharedValue(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => hidden.set(false));
    const hide = Keyboard.addListener('keyboardDidHide', () => hidden.set(true));
    return () => { show.remove(); hide.remove(); };
  }, [hidden]);
  return useDerivedValue(() => hidden.get() && keyboard.state.get() !== KeyboardState.OPENING ? 0 : keyboard.height.get());
}
