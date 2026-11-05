import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AnimatedEmoji } from '@/components/ui/AnimatedEmoji';
import { DayStrip } from '@/components/ui/DayStrip';
import { Icon } from '@/components/ui/Icon';
import { MonthGrid } from '@/components/ui/MonthGrid';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { durations, easing } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { addMonths, monthName, startOfMonth } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import type { Todo } from '@/lib/repos/diary';
import { MOODS } from './JournalEditor';

/** Flick speed (pt/s) that opens or closes the month, or turns it, regardless of distance. */
const FLICK_VELOCITY = 500;
/** Sideways drag (pt) that turns the month; how far the grid follows; how far it slides. */
const TURN_DISTANCE = 56;
const FOLLOW = 0.45;
const TRAVEL = 0.25;
const BADGE_SIZE = 20;

/**
 * The Diary's date control. Collapsed, it is a free-scrolling row of days. Drag it down and
 * it expands the month beneath the permanent day row. Drag up, or pick a day, to fold only
 * the month back. The grabber
 * toggles it with a tap. The page stops scrolling while it is dragged. Open, swipe the month
 * sideways to turn it (left for next, as elsewhere in the app): it follows the finger, slides
 * out, and the new month slides in from the far side; the ‹ › arrows slide it the same way.
 */
export function DiaryDateBar({ today, selected, month, markedDates, moods, monthlyTodos, onSelect, onMonthChange, onDraggingChange }: {
  today: string; selected: string; month: string; markedDates: ReadonlySet<string>;
  /** Journal mood (index into MOODS) per day of the shown month. */
  moods: Readonly<Record<string, number>>; monthlyTodos: Todo[];
  onSelect: (date: string) => void; onMonthChange: (month: string) => void; onDraggingChange: (dragging: boolean) => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [monthHeight, setMonthHeight] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const start = useSharedValue(0);
  const range = Math.max(1, monthHeight);
  // Computed here: the gesture callbacks run on the UI thread and cannot call date helpers.
  const selectedMonth = startOfMonth(selected);

  const settle = (open: boolean) => {
    setExpanded(open);
    if (open) onMonthChange(selectedMonth);
  };
  const toggle = (open: boolean) => {
    haptics.selection();
    progress.set(animateTo(open ? 1 : 0, 'gentle', reduced));
    settle(open);
  };
  const pan = usePanGesture({
    enabled: monthHeight > 0,
    activeOffsetY: [-10, 10],
    failOffsetX: [-14, 14],
    onActivate: () => {
      start.set(progress.get());
      scheduleOnRN(onDraggingChange, true);
      // Show the selected day's month as soon as the pull starts, not after release.
      if (progress.get() === 0) scheduleOnRN(onMonthChange, selectedMonth);
    },
    onUpdate: (event) => {
      progress.set(Math.max(0, Math.min(1, start.get() + event.translationY / range)));
    },
    onDeactivate: (event) => {
      if (event.canceled) { progress.set(animateTo(start.get(), 'gentle', reduced)); return; }
      const open = event.velocityY > FLICK_VELOCITY || (event.velocityY > -FLICK_VELOCITY && progress.get() > 0.5);
      progress.set(animateTo(open ? 1 : 0, 'gentle', reduced));
      scheduleOnRN(haptics.selection);
      scheduleOnRN(settle, open);
    },
    onFinalize: () => {
      scheduleOnRN(onDraggingChange, false);
    },
  });

  const slide = useSharedValue(0);
  const fade = useSharedValue(1);
  const shownMonth = useRef(month);
  useEffect(() => {
    const before = shownMonth.current;
    shownMonth.current = month;
    if (before === month) return;
    fade.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: durations.normal, easing: easing.standard })));
    slide.set(reduced ? 0 : withSequence(withTiming((month > before ? 1 : -1) * width * TRAVEL, { duration: 0 }), animateTo(0, 'snappy', false)));
  }, [month, reduced, width, fade, slide]);
  const turnMonth = (delta: 1 | -1) => {
    haptics.selection();
    onMonthChange(addMonths(month, delta));
  };
  const turn = usePanGesture({
    enabled: expanded,
    activeOffsetX: [-16, 16],
    failOffsetY: [-12, 12],
    onUpdate: (event) => {
      if (!reduced) slide.set(event.translationX * FOLLOW);
    },
    onDeactivate: (event) => {
      const flick = Math.abs(event.velocityX) > FLICK_VELOCITY && Math.sign(event.velocityX) === Math.sign(event.translationX);
      if (Math.abs(event.translationX) < TURN_DISTANCE && !flick) {
        slide.set(animateTo(0, 'snappy', reduced));
        return;
      }
      const delta = event.translationX < 0 ? 1 : -1;
      fade.set(withTiming(0, { duration: durations.fast, easing: easing.standard }));
      slide.set(withTiming(reduced ? 0 : -delta * width * TRAVEL, { duration: durations.fast, easing: easing.standard }, (finished) => {
        if (finished) scheduleOnRN(turnMonth, delta);
      }));
    },
  });
  const turnStyle = useAnimatedStyle(() => ({ opacity: fade.get(), transform: [{ translateX: slide.get() }] }));

  const containerStyle = useAnimatedStyle(() => ({ height: interpolate(progress.get(), [0, 1], [0, monthHeight], Extrapolation.CLAMP) }));
  const monthStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.15, 0.7], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.get(), [0, 1], [-theme.spacing.xl, 0]) }],
  }));
  const grabberStyle = useAnimatedStyle(() => ({ width: theme.sizes.grabberWidth * interpolate(progress.get(), [0, 1], [1, 1.4]) }));

  // Each day's mood sits at the corner of its circle; the selected day's one animates.
  const moodBadge = (date: string) => moods[date] === undefined ? null
    : <AnimatedEmoji emoji={MOODS[moods[date]]} size={BADGE_SIZE} playing={date === selected} />;
  const arrow = { minWidth: theme.sizes.touchTarget, minHeight: theme.sizes.touchTarget, alignItems: 'center', justifyContent: 'center' } as const;

  return <GestureDetector gesture={pan}>
    <View style={{ paddingHorizontal: theme.spacing.sm }}>
      {/* The week is independent of the clipped month, including its first measurement. */}
      <DayStrip today={today} selected={selected} markedDates={markedDates} onSelect={onSelect} />
      <Animated.View style={[styles.clip, containerStyle]}>
        <Animated.View pointerEvents={expanded ? 'auto' : 'none'} accessibilityElementsHidden={!expanded} importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
          style={[styles.month, { gap: theme.spacing.sm }, monthStyle]}
          onLayout={(event: LayoutChangeEvent) => setMonthHeight(event.nativeEvent.layout.height)}>
          <View style={styles.row}>
            <PressableScale haptic="selection" accessibilityLabel="Previous month" onPress={() => onMonthChange(addMonths(month, -1))} style={arrow}>
              <Icon name="chevronLeft" color="accent" />
            </PressableScale>
            <Text variant="headline" align="center" style={styles.fill}>{monthName(month)}{month.slice(0, 4) === today.slice(0, 4) ? '' : ` ${month.slice(0, 4)}`}</Text>
            <PressableScale haptic="selection" accessibilityLabel="Next month" onPress={() => onMonthChange(addMonths(month, 1))} style={arrow}>
              <Icon name="chevronRight" color="accent" />
            </PressableScale>
          </View>
          <GestureDetector gesture={turn}>
            <Animated.View style={turnStyle} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
              <MonthGrid month={month} today={today} selected={selected} todoDates={new Set(monthlyTodos.map((t) => t.date))} renderBadge={moodBadge}
                onSelect={(date) => { onSelect(date); toggle(false); }} />
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </Animated.View>
      <PressableScale haptic="tap" accessibilityLabel={expanded ? 'Show the week' : 'Show the month'} accessibilityHint="Or drag the dates up or down"
        onPress={() => toggle(!expanded)} style={[styles.center, { minHeight: theme.sizes.touchTarget / 2, paddingTop: theme.spacing.xs }]}>
        <Animated.View style={[{ height: theme.sizes.grabberHeight, borderRadius: theme.radii.pill, backgroundColor: theme.colors.tertiaryLabel }, grabberStyle]} />
      </PressableScale>
    </View>
  </GestureDetector>;
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  month: { position: 'absolute', top: 0, left: 0, right: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
