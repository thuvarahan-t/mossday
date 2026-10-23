/**
 * Colour tokens. Values come from the design cover (iOS system colours) — see
 * docs/UI-ANALYSIS.md R1–R3. Screens read these through `useTheme()`, never as literals.
 */

/** iOS system accents. Used only inside small icon tiles and data marks (cover rule). */
export const accents = {
  light: {
    green: '#34C759', blue: '#007AFF', indigo: '#5856D6', orange: '#FF9500', yellow: '#FFCC00',
    red: '#FF3B30', pink: '#FF2D55', purple: '#AF52DE', teal: '#30B0C7', gray: '#8E8E93',
  },
  dark: {
    green: '#30D158', blue: '#0A84FF', indigo: '#5E5CE6', orange: '#FF9F0A', yellow: '#FFD60A',
    red: '#FF453A', pink: '#FF375F', purple: '#BF5AF2', teal: '#40C8E0', gray: '#8E8E93',
  },
} as const;

export type AccentName = keyof typeof accents.light;

const light = {
  // Surfaces
  background: '#FFFFFF',
  secondaryBackground: '#F2F2F7',
  groupedBackground: '#F2F2F7',
  card: '#FFFFFF',
  sheet: '#FFFFFF',
  groupedSheet: '#F2F2F7',
  // Text
  label: '#000000',
  secondaryLabel: '#6C6C70',
  tertiaryLabel: 'rgba(60, 60, 67, 0.3)',
  // Lines & fills (translucent so they read correctly on any surface)
  separator: '#C6C6C8',
  fill: 'rgba(118, 118, 128, 0.12)',
  secondaryFill: 'rgba(118, 118, 128, 0.2)',
  // Tint — `accent` carries text, `accentBar` fills without text (R2)
  accent: '#248A3D',
  accentBar: '#34C759',
  accentFill: 'rgba(52, 199, 89, 0.15)',
  onAccent: '#FFFFFF',
  // Controls
  segmentThumb: '#FFFFFF',
  toggleOff: '#E9E9EA',
  knob: '#FFFFFF',
  chartBar: 'rgba(52, 199, 89, 0.45)',
  // Status
  danger: '#FF3B30',
  dangerText: '#D70015',
  dangerFill: 'rgba(255, 59, 48, 0.12)',
  onDanger: '#FFFFFF',
  /** Glyphs on coloured icon tiles. */
  onTile: '#FFFFFF',
  warning: '#FF9500',
  warningText: '#C93400',
  // Glass
  glassTint: 'rgba(255, 255, 255, 0.62)',
  glassTintPressed: 'rgba(255, 255, 255, 0.8)',
  glassHighlight: 'rgba(255, 255, 255, 0.9)',
  glassBorder: 'rgba(0, 0, 0, 0.05)',
  glassFallback: 'rgba(249, 249, 251, 0.94)',
  // Always-dark material for toasts (R14)
  hudTint: 'rgba(44, 44, 46, 0.86)',
  hudLabel: '#FFFFFF',
  hudAccent: '#30D158',
  hudFill: 'rgba(255, 255, 255, 0.14)',
  scrim: 'rgba(0, 0, 0, 0.22)',
  /** Shows around the app while a large sheet scales it down (iOS card stack). */
  underlay: '#000000',
  /** Context menu backdrop over the blurred app. */
  menuScrim: 'rgba(0, 0, 0, 0.12)',
  shadow: '#000000',
};

export type ColorTokens = { [K in keyof typeof light]: string };

const dark: ColorTokens = {
  background: '#000000',
  secondaryBackground: '#1C1C1E',
  groupedBackground: '#000000',
  card: '#1C1C1E',
  sheet: '#1C1C1E',
  groupedSheet: '#1C1C1E',
  label: '#FFFFFF',
  secondaryLabel: '#AEAEB2',
  tertiaryLabel: 'rgba(235, 235, 245, 0.3)',
  separator: '#38383A',
  fill: 'rgba(118, 118, 128, 0.24)',
  secondaryFill: 'rgba(118, 118, 128, 0.32)',
  accent: '#30D158',
  accentBar: '#30D158',
  accentFill: 'rgba(48, 209, 88, 0.18)',
  // Apple's increased-contrast green keeps black text readable on the bright dark-mode tint.
  onAccent: '#000000',
  segmentThumb: '#636366',
  toggleOff: '#39393D',
  knob: '#FFFFFF',
  chartBar: 'rgba(48, 209, 88, 0.4)',
  danger: '#FF453A',
  dangerText: '#FF6961',
  dangerFill: 'rgba(255, 69, 58, 0.18)',
  onDanger: '#FFFFFF',
  onTile: '#FFFFFF',
  warning: '#FF9F0A',
  warningText: '#FFB340',
  glassTint: 'rgba(28, 28, 30, 0.45)',
  glassTintPressed: 'rgba(58, 58, 60, 0.6)',
  glassHighlight: 'rgba(255, 255, 255, 0.16)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassFallback: 'rgba(30, 30, 32, 0.94)',
  hudTint: 'rgba(58, 58, 60, 0.88)',
  hudLabel: '#FFFFFF',
  hudAccent: '#30D158',
  hudFill: 'rgba(255, 255, 255, 0.14)',
  scrim: 'rgba(0, 0, 0, 0.5)',
  underlay: '#000000',
  menuScrim: 'rgba(0, 0, 0, 0.35)',
  shadow: '#000000',
};

export const colors = { light: light as ColorTokens, dark } as const;

/** Habit heatmap levels 0–4 (R3). */
export const heatmapColors = {
  light: ['#E5E5EA', '#9BE9A8', '#40C463', '#30A14E', '#216E39'],
  dark: ['#2C2C2E', '#0E4429', '#006D32', '#26A641', '#30D158'],
} as const;

/** Diary calendar spending tint, level 0 (none) to 4 (most spent). */
export const spendColors = {
  light: ['transparent', '#FFF6EA', '#FFEBCF', '#FFDDAA', '#FFB84D'],
  dark: ['transparent', 'rgba(255, 159, 10, 0.14)', 'rgba(255, 159, 10, 0.26)', 'rgba(255, 159, 10, 0.42)', 'rgba(255, 159, 10, 0.64)'],
} as const;

/** Each tab's icon tint in the Quick Add sheet and module tiles. */
export const moduleAccent = {
  expenses: 'orange', habits: 'green', diary: 'indigo', notes: 'yellow',
} as const satisfies Record<string, AccentName>;
