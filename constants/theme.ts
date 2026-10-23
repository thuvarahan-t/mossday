const sharedColors = { accent: '#22C55E', danger: '#EF4444', warning: '#F59E0B' };

export const colors = {
  light: {
    ...sharedColors,
    background: '#F7F8FA', card: '#FFFFFF', text: '#111827',
    textSecondary: '#6B7280', border: '#E5E7EB',
  },
  dark: {
    ...sharedColors,
    background: '#0F1115', card: '#1A1D23', text: '#F3F4F6',
    textSecondary: '#9CA3AF', border: '#2A2E36',
  },
} as const;

export const moduleColors = {
  expenses: '#F97316', habits: '#22C55E', diary: '#6366F1', notes: '#F59E0B',
} as const;

export const heatmapColors = {
  light: ['#EBEDF0', '#9BE9A8', '#40C463', '#30A14E', '#216E39'],
  dark: ['#161B22', '#0E4429', '#006D32', '#26A641', '#39D353'],
} as const;

export const spacing = { none: 0, xs: 8, sm: 16, md: 24, lg: 32, xl: 40, xxl: 48 } as const;
export const radii = { card: 16, sheet: 24, pill: 999 } as const;
export const typography = { total: 32, title: 20, body: 16, caption: 13 } as const;
