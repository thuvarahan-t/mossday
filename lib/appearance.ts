import { Appearance } from 'react-native';
export type AppearancePreference = 'system' | 'light' | 'dark';
let preference: AppearancePreference = 'system';
const listeners = new Set<() => void>();
export const getAppearancePreference = () => preference;
export function subscribeAppearance(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
/** React Native Web has no setColorScheme; keep the app preference reactive on every platform. */
export function applyAppearance(value: AppearancePreference) {
  preference = value;
  if (typeof Appearance.setColorScheme === 'function') Appearance.setColorScheme(value === 'system' ? 'auto' : value);
  listeners.forEach((listener) => listener());
}
