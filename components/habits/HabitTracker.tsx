import { memo, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, View } from 'react-native';
import { Heatmap, HeatmapWeekdayLabels } from '@/components/ui/Heatmap';
import { useTheme } from '@/hooks/useTheme';
import { daysBetween } from '@/lib/date';
import type { Habit } from '@/lib/repos/habits';
import { habitYear } from './habitPeriod';

/** Weeks kept visible to the right of the scrolled-to day, so it never sits on the edge. */
const TRAILING_WEEKS = 2;

/**
 * The year's contribution grid. It opens scrolled to the selected day's column (today by
 * default), not January; tap a day or drag the outlined one to choose another.
 */
export const HabitTracker = memo(function HabitTracker({ habit, counts, anchor, today, selected = today, onSelectDate, onScrubChange, fitWidth }: {
  habit: Habit; counts: Readonly<Record<string, number>>; anchor: string; today: string;
  selected?: string; onSelectDate?: (date: string) => void;
  /** Dragging the outlined day started or ended; the page pauses its scrolling meanwhile. */
  onScrubChange?: (scrubbing: boolean) => void;
  /** Static exported images fit the full year within their known panel width. */
  fitWidth?: number;
}) {
  const theme = useTheme();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [scrubbing, setScrubbing] = useState(false);
  // scrollTo is ignored before the content has a width, so wait for both measurements, and
  // only position once per year so choosing a day never yanks the grid around.
  const viewport = useRef(0);
  const content = useRef(0);
  const positionedYear = useRef<string | null>(null);
  const period = habitYear(anchor);
  const squareSize = fitWidth ? Math.max(2, (fitWidth - (period.weeks - 1) * 2) / period.weeks) : theme.sizes.heatmapSquare;
  const grid = <Heatmap color={habit.color} startDate={period.gridStart} weeks={period.weeks} counts={counts} today={today}
    dailyGoal={habit.dailyGoal} activeDays={habit.activeDays} outlinedDate={selected} showMonthLabels future="faint"
    minDate={period.start} maxDate={period.end} squareSize={squareSize} gap={fitWidth ? 2 : undefined} onSelectDate={onSelectDate}
    onScrubChange={(active) => { setScrubbing(active); onScrubChange?.(active); }} />;
  if (fitWidth) return grid;
  const focus = selected >= period.start && selected <= period.end ? selected : period.start;
  const focusRight = (Math.floor(daysBetween(period.gridStart, focus) / 7) + 1 + TRAILING_WEEKS) * (squareSize + theme.sizes.heatmapGap);
  const position = () => {
    if (!viewport.current || !content.current || positionedYear.current === period.label) return;
    positionedYear.current = period.label;
    scroll.current?.scrollTo({ x: Math.max(0, Math.min(focusRight, content.current) - viewport.current), animated: false });
  };
  return <View style={{ flexDirection: 'row' }}><HeatmapWeekdayLabels />
    <ScrollView ref={scroll} horizontal scrollEnabled={!scrubbing} showsHorizontalScrollIndicator={false} accessibilityLabel={`${period.label} habit tracker`}
      onLayout={(event) => { viewport.current = event.nativeEvent.layout.width; position(); }}
      onContentSizeChange={(width) => { content.current = width; position(); }}>
      {grid}
    </ScrollView>
  </View>;
});
