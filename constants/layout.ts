/** Spacing scale (pt). Only these steps are used for padding, margins and gaps. */
export const spacing = {
  none: 0, xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
} as const;

/** Corner radii. Pair with `borderCurve: 'continuous'` for iOS squircle corners. */
export const radii = {
  hairline: 3, // heatmap squares, chart bars
  sm: 8, // icon tiles
  md: 10, // segmented control, stepper
  lg: 14, // meal tiles, text fields, options bar
  xl: 16, // category tiles, images
  card: 20,
  sheet: 28,
  pill: 999,
} as const;

/** Shared component dimensions measured from the design (see docs/UI-ANALYSIS.md §2). */
export const sizes = {
  screenInset: spacing.lg, // cards from screen edge
  titleInset: spacing.xl, // large titles and section headers
  cardPadding: spacing.xl,
  rowPadding: spacing.lg,
  rowMinHeight: 52,
  hairline: 0.5,
  iconTile: 32,
  iconTileLarge: 36,
  emojiTile: 52, // Add Habit emoji button and picker cells
  iconTileSettings: 30,
  icon: 22,
  iconSmall: 17,
  iconLarge: 24,
  iconEmpty: 48,
  touchTarget: 44,
  circleButton: 44,
  toolbarHeight: 52, // note editor floating tool pill
  tabBarHeight: 62,
  tabItemHighlight: 52,
  tabProminentIcon: 30, // green disc behind the centre Today icon
  buttonHeight: 52,
  smallButtonHeight: 36,
  chipHeight: 40,
  smallChipHeight: 34,
  controlHeight: 36,
  fieldHeight: 48,
  searchHeight: 38,
  checkbox: 24,
  toggleWidth: 51,
  toggleHeight: 31,
  progressBar: 8,
  thinBar: 4,
  dot: 4,
  grabberWidth: 36,
  grabberHeight: 5,
  toastHeight: 50,
  heatmapSquare: 13,
  heatmapGap: 3.5,
  habitRing: 56,
  tickButton: 44,
  dayCircle: 40,
  keypadKeyHeight: 62,
  emptyStateMaxWidth: 300,
} as const;
