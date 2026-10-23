import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
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
};

/** iOS segmented control: the raised thumb slides between segments with `spring.snappy`. */
export function SegmentedControl<T extends string>({ segments, selected, onChange }: SegmentedControlProps<T>) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [segmentWidth, setSegmentWidth] = useState(0);
  const index = Math.max(0, segments.indexOf(selected));
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.set(animateTo(index * segmentWidth, 'snappy', reduceMotion));
  }, [index, offset, reduceMotion, segmentWidth]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  const onLayout = (event: LayoutChangeEvent) => {
    setSegmentWidth((event.nativeEvent.layout.width - THUMB_INSET * 2) / segments.length);
  };

  return (
    <View
      onLayout={onLayout}
      accessibilityRole="tablist"
      style={[styles.track, {
        height: theme.sizes.controlHeight, borderRadius: theme.radii.md, backgroundColor: theme.colors.fill,
        padding: THUMB_INSET, marginHorizontal: theme.sizes.screenInset,
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
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row' },
  thumb: { position: 'absolute', borderCurve: 'continuous' },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
