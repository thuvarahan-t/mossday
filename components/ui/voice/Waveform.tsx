import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export type WaveformProps = {
  /** Bar heights 0 → 1. */
  bars: readonly number[];
  /** Fraction of bars drawn in `activeColor` (playback progress). */
  progress?: number;
  activeColor: string;
  inactiveColor: string;
  /** Extra dotted slots after the bars (recording: room still to fill). */
  pendingSlots?: number;
  height?: number;
};

const BAR_WIDTH = 3;
const MIN_BAR = 0.12;

export const Waveform = memo(function Waveform({
  bars, progress = 1, activeColor, inactiveColor, pendingSlots = 0, height = 28,
}: WaveformProps) {
  const theme = useTheme();
  const playedCount = Math.round(bars.length * progress);
  return (
    <View style={[styles.row, { height, gap: BAR_WIDTH }]} accessible={false}>
      {bars.map((value, index) => (
        <View
          key={index}
          style={{
            width: BAR_WIDTH, height: Math.max(MIN_BAR, Math.min(1, value)) * height,
            borderRadius: theme.radii.pill, backgroundColor: index < playedCount ? activeColor : inactiveColor,
          }}
        />
      ))}
      {Array.from({ length: pendingSlots }, (_, index) => (
        <View key={`p${index}`} style={{ width: BAR_WIDTH, height: BAR_WIDTH, borderRadius: theme.radii.pill, backgroundColor: inactiveColor }} />
      ))}
    </View>
  );
});

/**
 * Decorative waveform for a saved voice note. Only duration is stored (spec §7), so the
 * shape is derived deterministically from the file name: the same note always looks the same.
 */
export function waveformFromSeed(seed: string, count: number): number[] {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  return Array.from({ length: count }, (_, index) => {
    hash = Math.imul(hash ^ (index + 1), 16777619);
    const noise = ((hash >>> 0) % 1000) / 1000;
    const envelope = 0.55 + 0.45 * Math.sin((index / count) * Math.PI);
    return Math.max(MIN_BAR, noise * envelope);
  });
}

/** Normalises a recorder metering value (dBFS, about −60…0) to 0 → 1. */
export function levelFromMetering(db: number | undefined): number {
  if (db === undefined) return MIN_BAR;
  return Math.max(MIN_BAR, Math.min(1, (db + 60) / 60));
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });
