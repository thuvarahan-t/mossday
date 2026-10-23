import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { haptics } from '@/lib/haptics';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

const THUMB_INSET = 2;

export type SegmentedControlProps<T extends string> = {
  segments: readonly T[];
  selected: T;
  onChange: (segment: T) => void;
  /** Keep the screen-edge margins; off when the control sits inside a row. */
  inset?: boolean;
};

/**
 * iOS segmented control: the raised thumb slides between segments with `spring.snappy`.
 * Like the tab bar, dragging along the track carries the thumb under the finger (a tick per
 * segment crossed) and releasing selects the segment below it.
 */
export function SegmentedControl<T extends string>({ segments, selected, onChange, inset = true }: SegmentedControlProps<T>) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [segmentWidth, setSegmentWidth] = useState(0);
  const index = Math.max(0, segments.indexOf(selected));
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.set(animateTo(index * segmentWidth, 'snappy', reduceMotion));
  }, [index, offset, reduceMotion, segmentWidth]);

  const hovered = useSharedValue(index);
  const selectIndex = (next: number) => {
    const segment = segments[next];
    if (segment !== undefined && segment !== selected) onChange(segment);
  };
  const lastIndex = segments.length - 1;
  const pan = usePanGesture({
    enabled: segmentWidth > 0,
    activeOffsetX: [-8, 8],
    failOffsetY: [-16, 16],
    onActivate: () => {
      hovered.set(Math.round(offset.get() / segmentWidth));
    },
    onUpdate: (event) => {
      const x = Math.min(Math.max(event.x - THUMB_INSET - segmentWidth / 2, 0), segmentWidth * lastIndex);
      offset.set(x);
      const next = Math.round(x / segmentWidth);
      if (next !== hovered.get()) {
        hovered.set(next);
        scheduleOnRN(haptics.selection);
      }
    },
    onDeactivate: () => {
      const next = hovered.get();
      offset.set(animateTo(next * segmentWidth, 'snappy', reduceMotion));
      scheduleOnRN(selectIndex, next);
    },
  });

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  const onLayout = (event: LayoutChangeEvent) => {
    setSegmentWidth((event.nativeEvent.layout.width - THUMB_INSET * 2) / segments.length);
  };

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={onLayout}
        accessibilityRole="tablist"
        style={[styles.track, {
          height: theme.sizes.controlHeight, borderRadius: theme.radii.md, backgroundColor: theme.colors.fill,
          padding: THUMB_INSET, marginHorizontal: inset ? theme.sizes.screenInset : 0,
        }]}
      >
        {segmentWidth > 0 && (
          <Animated.View
            style={[styles.thumb, {
              top: THUMB_INSET, bottom: THUMB_INSET, left: THUMB_INSET, width: segmentWidth,
              borderRadius: theme.radii.md - THUMB_INSET, backgroundColor: theme.colors.segmentThumb,
              boxShadow: theme.shadows.thumb,
            }, thumbStyle]}
          />
        )}
        {segments.map((segment) => {
          const isSelected = segment === selected;
          return (
            <PressableScale
              key={segment}
              style={styles.segment}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={segment}
              onPress={() => {
                if (isSelected) return;
                haptics.selection();
                onChange(segment);
              }}
            >
              <Text variant="subheadline" weight={isSelected ? 'semibold' : 'regular'}>{segment}</Text>
            </PressableScale>
          );
        })}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row' },
  thumb: { position: 'absolute', borderCurve: 'continuous' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
