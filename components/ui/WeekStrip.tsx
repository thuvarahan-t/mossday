import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { durations, easing } from '@/constants/motion';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { addDays, dayOfMonth, formatLongDate, WEEKDAY_LETTERS, type LocalDate } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type WeekStripProps = {
  /** Monday of the visible week. */
  weekStart: LocalDate;
  selected: LocalDate;
  today: LocalDate;
  /** Days that have to-dos or a journal entry get a small dot (UI-ANALYSIS R16). */
  markedDates?: ReadonlySet<LocalDate>;
  onSelect: (date: LocalDate) => void;
  /** Swipe left/right: ±1 week. */
  onChangeWeek: (delta: 1 | -1) => void;
  /** Pull the strip down (or tap its grabber) to open the month calendar. */
  onOpenCalendar?: () => void;
};

/** Drag distance (pt) or flick speed (pt/s) that commits a week swipe or a pull-down. */
const COMMIT_DISTANCE = 48;
const COMMIT_VELOCITY = 600;
/** How far the days follow the finger sideways, and how much the pull-down stretches. */
const FOLLOW = 0.45;
const PULL = 0.4;
/** Share of the strip's width a week slides out and the next slides in from. */
const TRAVEL = 0.25;

/**
 * Mon–Sun strip under the Diary title; the green selection circle slides between days.
 * Swipe sideways to turn the week (left for next): the days follow the finger, slide out,
 * and the new week slides in from the far side. Pull down to open the month calendar.
 */
export function WeekStrip({ weekStart, selected, today, markedDates, onSelect, onChangeWeek, onOpenCalendar }: WeekStripProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [cellWidth, setCellWidth] = useState(0);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const selectedIndex = days.indexOf(selected);
  const offset = useSharedValue(0);
  const circle = theme.sizes.dayCircle;

  useEffect(() => {
    if (selectedIndex >= 0) offset.set(animateTo(selectedIndex * cellWidth, 'snappy', reduceMotion));
  }, [cellWidth, offset, reduceMotion, selectedIndex]);

  const circleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  const [stripWidth, setStripWidth] = useState(0);
  const slide = useSharedValue(0);
  const fade = useSharedValue(1);
  const pull = useSharedValue(0);
  /** 0 until the drag picks a direction, then 1 for sideways (week) or 2 for down (calendar). */
  const axis = useSharedValue(0);
  const shownWeek = useRef(weekStart);
  useEffect(() => {
    const before = shownWeek.current;
    shownWeek.current = weekStart;
    if (before === weekStart) return;
    const fadeIn = withTiming(1, { duration: durations.normal, easing: easing.standard });
    fade.set(withSequence(withTiming(0, { duration: 0 }), fadeIn));
    slide.set(reduceMotion ? 0 : withSequence(withTiming((weekStart > before ? 1 : -1) * stripWidth * TRAVEL, { duration: 0 }), animateTo(0, 'snappy', false)));
  }, [weekStart, reduceMotion, stripWidth, fade, slide]);

  const turnWeek = (delta: 1 | -1) => { haptics.selection(); onChangeWeek(delta); };
  const openCalendar = () => { haptics.selection(); onOpenCalendar?.(); };
  const swipe = usePanGesture({
    activeOffsetX: [-16, 16],
    // Downward pulls open the calendar; upward drags fail at once so the page scrolls.
    activeOffsetY: onOpenCalendar ? [-10000, 16] : [-10000, 10000],
    failOffsetY: onOpenCalendar ? [-12, 10000] : [-12, 12],
    onActivate: (event) => {
      axis.set(Math.abs(event.translationX) >= Math.abs(event.translationY) ? 1 : 2);
    },
    onUpdate: (event) => {
      if (reduceMotion) return;
      if (axis.get() === 1) slide.set(event.translationX * FOLLOW);
      else pull.set(Math.max(0, event.translationY) * PULL);
    },
    onDeactivate: (event) => {
      if (axis.get() === 2) {
        pull.set(animateTo(0, 'snappy', reduceMotion));
        if (event.translationY > COMMIT_DISTANCE || event.velocityY > COMMIT_VELOCITY) scheduleOnRN(openCalendar);
        return;
      }
      const flick = Math.abs(event.velocityX) > COMMIT_VELOCITY && Math.sign(event.velocityX) === Math.sign(event.translationX);
      if (Math.abs(event.translationX) < COMMIT_DISTANCE && !flick) {
        slide.set(animateTo(0, 'snappy', reduceMotion));
        return;
      }
      const delta = event.translationX < 0 ? 1 : -1;
      fade.set(withTiming(0, { duration: durations.fast, easing: easing.standard }));
      slide.set(withTiming(reduceMotion ? 0 : -delta * stripWidth * TRAVEL, { duration: durations.fast, easing: easing.standard }, (finished) => {
        if (finished) scheduleOnRN(turnWeek, delta);
      }));
    },
    onFinalize: () => {
      axis.set(0);
    },
  });
  const daysStyle = useAnimatedStyle(() => ({ opacity: fade.get(), transform: [{ translateX: slide.get() }, { translateY: pull.get() }] }));
  const grabberStyle = useAnimatedStyle(() => ({ width: theme.sizes.grabberWidth + pull.get(), transform: [{ translateY: pull.get() }] }));

  return (
    <GestureDetector gesture={swipe}>
      <View
        onLayout={(event: LayoutChangeEvent) => {
          setStripWidth(event.nativeEvent.layout.width);
          setCellWidth((event.nativeEvent.layout.width - theme.spacing.sm * 2) / 7);
        }}
        style={{ paddingHorizontal: theme.spacing.sm }}
      >
        <Animated.View style={daysStyle}>
        <View style={styles.row}>
          {WEEKDAY_LETTERS.map((letter, index) => (
            <Text key={`${letter}${index}`} variant="footnote" color="secondaryLabel" align="center" style={styles.cell}>{letter}</Text>
          ))}
        </View>
        <View style={[styles.row, { marginTop: theme.spacing.sm }]}>
          {selectedIndex >= 0 && cellWidth > 0 && (
            <Animated.View
              style={[styles.circle, {
                width: circle, height: circle, borderRadius: theme.radii.pill, backgroundColor: theme.colors.accent,
                left: (cellWidth - circle) / 2,
              }, circleStyle]}
            />
          )}
          {days.map((date) => {
            const isSelected = date === selected;
            const isToday = date === today;
            return (
              <PressableScale
                key={date}
                style={[styles.cell, { height: circle + theme.spacing.sm }]}
                accessibilityLabel={formatLongDate(date)}
                accessibilityState={{ selected: isSelected }}
                onPress={() => { if (!isSelected) { haptics.selection(); onSelect(date); } }}
              >
                <View style={[styles.center, { height: circle }]}>
                  <Text
                    variant="title3"
                    weight={isSelected ? 'semibold' : 'regular'}
                    color={isSelected ? 'onAccent' : isToday ? 'accent' : 'label'}
                    tabular
                  >
                    {dayOfMonth(date)}
                  </Text>
                </View>
                <View style={{
                  width: theme.sizes.dot, height: theme.sizes.dot, borderRadius: theme.radii.pill,
                  backgroundColor: markedDates?.has(date) ? theme.accents.gray : 'transparent',
                }} />
              </PressableScale>
            );
          })}
        </View>
        </Animated.View>
        {onOpenCalendar && <PressableScale haptic="tap" accessibilityLabel="Open month calendar" accessibilityHint="Or pull the week down"
          onPress={onOpenCalendar} style={[styles.center, { minHeight: theme.sizes.touchTarget / 2, paddingTop: theme.spacing.xs }]}>
          <Animated.View style={[{ height: theme.sizes.grabberHeight, borderRadius: theme.radii.pill, backgroundColor: theme.colors.tertiaryLabel }, grabberStyle]} />
        </PressableScale>}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  circle: { position: 'absolute', top: 0 },
});
