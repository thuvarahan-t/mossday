import { useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AnimatedListItem } from './AnimatedListItem';
import { masonryColumns } from './masonry';

/**
 * A two-column masonry grid ("box by box"): equal columns and gaps, each card as tall as its
 * content, placed in the shorter column. Heights come from `estimateHeight`, given the
 * measured column width, so the layout is settled on the first frame and never reshuffles
 * after measuring. Cards fade in and glide when the list changes.
 */
export function MasonryGrid<T>({ items, keyOf, estimateHeight, renderItem, columns = 2 }: {
  items: readonly T[]; keyOf: (item: T) => string | number;
  estimateHeight: (item: T, columnWidth: number) => number;
  renderItem: (item: T, columnWidth: number) => ReactNode;
  columns?: number;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const gap = theme.spacing.md;
  const inset = theme.sizes.screenInset;
  // The measured width includes the side insets; cards get only what is left between them.
  const columnWidth = (width - inset * 2 - gap * (columns - 1)) / columns;
  const placed = width ? masonryColumns(items.map((item) => estimateHeight(item, columnWidth)), columns, gap) : [];
  return <View onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
    style={{ flexDirection: 'row', alignItems: 'flex-start', gap, paddingHorizontal: inset }}>
    {placed.map((indexes, column) => <View key={column} style={{ flex: 1, gap }}>
      {indexes.map((index) => <AnimatedListItem key={keyOf(items[index])}>{renderItem(items[index], columnWidth)}</AnimatedListItem>)}
    </View>)}
  </View>;
}
