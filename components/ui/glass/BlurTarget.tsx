import { BlurTargetView } from 'expo-blur';
import { createContext, useContext, useRef, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { StyleSheet, type StyleProp, type View, type ViewStyle } from 'react-native';

type ViewInstance = ComponentRef<typeof View>;

type TargetRef = RefObject<ViewInstance | null>;

/**
 * Android only blurs what sits inside a `BlurTargetView`, so glass needs to know which
 * content is behind it. `BlurTargetProvider` owns that ref; `BlurTargetContent` wraps the
 * content to blur; glass rendered beside the content (tab bar, sheets, headers) blurs it.
 *
 * Glass *inside* the content would blur its own ancestor, so the content area resets the
 * context to `null` and nested glass uses the solid translucent fallback instead.
 */
const BlurTargetContext = createContext<TargetRef | null>(null);
const ProviderRefContext = createContext<TargetRef | null>(null);

export function BlurTargetProvider({ children }: { children: ReactNode }) {
  const ref = useRef<ViewInstance | null>(null);
  return (
    <ProviderRefContext.Provider value={ref}>
      <BlurTargetContext.Provider value={ref}>{children}</BlurTargetContext.Provider>
    </ProviderRefContext.Provider>
  );
}

export function BlurTargetContent({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useContext(ProviderRefContext);
  if (!ref) throw new Error('BlurTargetContent must be rendered inside a BlurTargetProvider.');
  return (
    <BlurTargetView ref={ref} style={style ?? StyleSheet.absoluteFill}>
      <BlurTargetContext.Provider value={null}>{children}</BlurTargetContext.Provider>
    </BlurTargetView>
  );
}

/** The content this glass can blur, or `null` when it must fall back to a solid surface. */
export function useBlurTarget(): TargetRef | null {
  return useContext(BlurTargetContext);
}
