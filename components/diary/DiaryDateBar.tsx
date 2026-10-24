import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { DayStrip } from '@/components/ui/DayStrip';
import { Icon } from '@/components/ui/Icon';
import { MonthGrid } from '@/components/ui/MonthGrid';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { addMonths, monthName, startOfMonth } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import type { Todo } from '@/lib/repos/diary';
import type { Expense } from '@/lib/repos/expenses';

/** Flick speed (pt/s) that opens or closes the month regardless of how far it was pulled. */
const FLICK_VELOCITY = 500;

/**
 * The Diary's date control. Collapsed, it is a free-scrolling row of days. Drag it down and
 * it expands into the month, following the finger (the month unfolds from under the row and
 * fades in as the row fades out); drag up, or pick a day, to fold it back. The grabber
 * toggles it with a tap. The page stops scrolling while it is dragged.
 */
export function DiaryDateBar({ today, selected, month, markedDates, monthlyExpenses, monthlyTodos, onSelect, onMonthChange, onDraggingChange }: {
  today: string; selected: string; month: string; markedDates: ReadonlySet<string>;
  monthlyExpenses: Expense[]; monthlyTodos: Todo[];
  onSelect: (date: string) => void; onMonthChange: (month: string) => void; onDraggingChange: (dragging: boolean) => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [stripHeight, setStripHeight] = useState(0);
  const [monthHeight, setMonthHeight] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const progress = useSharedValue(0);
  const start = useSharedValue(0);
  const range = Math.max(1, monthHeight - stripHeight);
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
      const open = event.velocityY > FLICK_VELOCITY || (event.velocityY > -FLICK_VELOCITY && progress.get() > 0.5);
      progress.set(animateTo(open ? 1 : 0, 'gentle', reduced));
      scheduleOnRN(haptics.selection);
      scheduleOnRN(settle, open);
    },
    onFinalize: () => {
      scheduleOnRN(onDraggingChange, false);
    },
  });

  const containerStyle = useAnimatedStyle(() => (monthHeight
    ? { height: interpolate(progress.get(), [0, 1], [stripHeight, monthHeight]) } : {}));
  const stripStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.get(), [0, 0.4], [1, 0], Extrapolation.CLAMP) }));
  const monthStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.15, 0.7], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.get(), [0, 1], [-theme.spacing.xl, 0]) }],
  }));
  const grabberStyle = useAnimatedStyle(() => ({ width: theme.sizes.grabberWidth * interpolate(progress.get(), [0, 1], [1, 1.4]) }));

  const amounts = monthlyExpenses.reduce<Record<string, number>>((result, e) => { result[e.date] = (result[e.date] ?? 0) + e.amount; return result; }, {});
  const maxSpend = Math.max(1, ...Object.values(amounts));
  const spendLevels = Object.fromEntries(Object.entries(amounts).map(([day, amount]) => [day, Math.ceil(amount / maxSpend * 4)]));
  const arrow = { minWidth: theme.sizes.touchTarget, minHeight: theme.sizes.touchTarget, alignItems: 'center', justifyContent: 'center' } as const;

  return <GestureDetector gesture={pan}>
    <View style={{ paddingHorizontal: theme.spacing.sm }}>
      <Animated.View style={[styles.clip, containerStyle]}>
        <Animated.View pointerEvents={expanded ? 'none' : 'auto'} style={stripStyle}
          onLayout={(event: LayoutChangeEvent) => setStripHeight(event.nativeEvent.layout.height)}>
          <DayStrip today={today} selected={selected} markedDates={markedDates} onSelect={onSelect} />
        </Animated.View>
        <Animated.View pointerEvents={expanded ? 'auto' : 'none'} style={[styles.month, { gap: theme.spacing.sm }, monthStyle]}
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
          <MonthGrid month={month} today={today} selected={selected} spendLevels={spendLevels} todoDates={new Set(monthlyTodos.map((t) => t.date))}
            onSelect={(date) => { onSelect(date); toggle(false); }} />
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
