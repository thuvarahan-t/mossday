import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { formatDuration } from '@/lib/date';
import { Icon } from '../Icon';
import { PressableScale } from '../PressableScale';
import { Text } from '../Text';
import { Waveform, waveformFromSeed } from './Waveform';

export type VoicePlayerProps = {
  uri: string;
  durationMs: number;
};

const PLAY_BUTTON = 40;
const BAR_COUNT = 28;

/** Voice-note block: green play button, waveform that fills as it plays, duration. */
export function VoicePlayer({ uri, durationMs }: VoicePlayerProps) {
  const theme = useTheme();
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const bars = useMemo(() => waveformFromSeed(uri, BAR_COUNT), [uri]);
  const duration = status.duration > 0 ? status.duration * 1000 : durationMs;
  const progress = duration > 0 ? (status.currentTime * 1000) / duration : 0;

  useEffect(() => {
    if (status.didJustFinish) player.seekTo(0).catch(() => undefined);
  }, [player, status.didJustFinish]);

  const toggle = () => {
    if (status.playing) player.pause();
    else player.play();
  };

  return (
    <View style={[styles.row, {
      borderRadius: theme.radii.pill, backgroundColor: theme.colors.fill,
      padding: theme.spacing.sm - 2, paddingRight: theme.spacing.xl, gap: theme.spacing.md,
    }]}>
      <PressableScale
        haptic="tap"
        onPress={toggle}
        accessibilityLabel={status.playing ? 'Pause voice note' : 'Play voice note'}
        style={[styles.center, { width: PLAY_BUTTON, height: PLAY_BUTTON, borderRadius: theme.radii.pill, backgroundColor: theme.colors.accent }]}
      >
        <Icon name={status.playing ? 'pause' : 'play'} size={theme.sizes.iconSmall} color="onAccent" fill={theme.colors.onAccent} />
      </PressableScale>
      <View style={styles.flex}>
        <Waveform bars={bars} progress={progress} activeColor={theme.colors.accent} inactiveColor={theme.colors.tertiaryLabel} />
      </View>
      <Text variant="subheadline" color="secondaryLabel" tabular>
        {formatDuration(status.playing ? status.currentTime * 1000 : duration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, overflow: 'hidden' },
});
