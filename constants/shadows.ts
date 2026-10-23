import type { ViewStyle } from 'react-native';

/**
 * iOS-style shadows: low opacity, large blur. `boxShadow` renders the same on iOS and
 * Android (new architecture), so no Material `elevation` is ever used.
 */
type ShadowSet = Record<'floating' | 'raised' | 'thumb' | 'knob' | 'sheet' | 'lifted', ViewStyle['boxShadow']>;

export const shadows: { light: ShadowSet; dark: ShadowSet } = {
  light: {
    floating: '0px 8px 30px rgba(0, 0, 0, 0.10)',
    raised: '0px 4px 16px rgba(0, 0, 0, 0.06)',
    thumb: '0px 3px 8px rgba(0, 0, 0, 0.12), 0px 3px 1px rgba(0, 0, 0, 0.04)',
    knob: '0px 3px 8px rgba(0, 0, 0, 0.15), 0px 1px 1px rgba(0, 0, 0, 0.16)',
    sheet: '0px -6px 40px rgba(0, 0, 0, 0.10)',
    lifted: '0px 20px 50px rgba(0, 0, 0, 0.18)',
  },
  dark: {
    floating: '0px 8px 30px rgba(0, 0, 0, 0.45)',
    raised: '0px 4px 16px rgba(0, 0, 0, 0.35)',
    thumb: '0px 3px 8px rgba(0, 0, 0, 0.35)',
    knob: '0px 3px 8px rgba(0, 0, 0, 0.3), 0px 1px 1px rgba(0, 0, 0, 0.3)',
    sheet: '0px -6px 40px rgba(0, 0, 0, 0.5)',
    lifted: '0px 20px 50px rgba(0, 0, 0, 0.6)',
  },
};
