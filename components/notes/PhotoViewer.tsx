import { Image } from 'expo-image';
import { Modal, useWindowDimensions } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';

const MAX_ZOOM = 5;
const DOUBLE_TAP_ZOOM = 2.5;

/** How far a zoomed photo may pan along one axis before its edge would leave the screen edge. */
function clampPan(value: number, size: number, zoom: number) {
  'worklet';
  const limit = size * (zoom - 1) / 2;
  return Math.max(-limit, Math.min(limit, value));
}

/**
 * A note photo on black, whole and uncropped. Pinch or double tap to zoom, drag to look around
 * a zoomed photo; tap × or Back to return.
 */
export function PhotoViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const zoom = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const start = useSharedValue({ zoom: 1, x: 0, y: 0 });
  const remember = () => {
    'worklet';
    start.set({ zoom: zoom.get(), x: x.get(), y: y.get() });
  };
  const settle = (target: number) => {
    'worklet';
    zoom.set(animateTo(target, 'snappy', reduced));
    x.set(animateTo(clampPan(x.get(), width, target), 'snappy', reduced));
    y.set(animateTo(clampPan(y.get(), height, target), 'snappy', reduced));
  };
  const pinch = usePinchGesture({
    onActivate: remember,
    onUpdate: (event) => { zoom.set(Math.max(1, Math.min(MAX_ZOOM, start.get().zoom * event.scale))); },
    onDeactivate: () => { settle(zoom.get()); },
  });
  const pan = usePanGesture({
    onActivate: remember,
    onUpdate: (event) => {
      x.set(clampPan(start.get().x + event.translationX, width, zoom.get()));
      y.set(clampPan(start.get().y + event.translationY, height, zoom.get()));
    },
  });
  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => { settle(zoom.get() > 1 ? 1 : DOUBLE_TAP_ZOOM); },
  });
  const gesture = useSimultaneousGestures(pinch, pan, doubleTap);
  const photoStyle = useAnimatedStyle(() => ({ flex: 1, transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: zoom.get() }] }));
  return <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
    {/* Touches inside a Modal do not reach the app's root gesture view on Android. */}
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={photoStyle}>
          <Image source={{ uri }} contentFit="contain" transition={150} accessibilityLabel="Photo" style={{ flex: 1 }} />
        </Animated.View>
      </GestureDetector>
      <PressableScale haptic="tap" accessibilityLabel="Close photo" onPress={onClose}
        style={{ position: 'absolute', top: insets.top + theme.spacing.lg, left: theme.spacing.lg, width: theme.sizes.circleButton, height: theme.sizes.circleButton,
          borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' }}>
        <Icon name="close" rawColor="#FFFFFF" />
      </PressableScale>
    </GestureHandlerRootView>
  </Modal>;
}
