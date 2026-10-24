import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { AnimatedEmoji } from '@/components/ui/AnimatedEmoji';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useAutosave } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { dataColors } from '@/lib/dataColors';
import { saveJournal, type DiaryEntry } from '@/lib/repos/diary';

export const MOODS = ['😞', '😐', '🙂', '😄', '🤩'];
const MOOD_LABELS = ['Very low', 'Low', 'Okay', 'Good', 'Great'];
/** Each mood glows in its own colour, cool for low days and warm for good ones. */
const MOOD_COLORS = ['blue', 'indigo', 'yellow', 'orange', 'pink'] as const;
const EMOJI_SIZE = 40;
const GLOW_SIZE = 58;

/**
 * One mood: the chosen one animates, grows a little over a soft glow in its colour and shows
 * its name; the others rest on their still image and dim while a mood is chosen.
 */
function MoodButton({ index, selected, dimmed, onPress }: { index: number; selected: boolean; dimmed: boolean; onPress: () => void }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const palette = dataColors(theme, MOOD_COLORS[index]);
  const progress = useSharedValue(selected ? 1 : 0);
  const dim = useSharedValue(dimmed ? 1 : 0);
  useEffect(() => { progress.set(animateTo(selected ? 1 : 0, 'bouncy', reduced)); }, [progress, reduced, selected]);
  useEffect(() => { dim.set(animateTo(dimmed ? 1 : 0, 'snappy', reduced)); }, [dim, dimmed, reduced]);
  const emojiStyle = useAnimatedStyle(() => ({ opacity: 1 - dim.get() * 0.55, transform: [{ scale: reduced ? 1 : 1 + progress.get() * 0.18 }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: progress.get(), transform: [{ scale: 0.6 + progress.get() * 0.4 }] }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  return <PressableScale haptic="selection" accessibilityLabel={MOOD_LABELS[index]} accessibilityRole="radio" accessibilityState={{ selected }}
    onPress={onPress} style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xs }}>
    <View style={{ width: GLOW_SIZE, height: GLOW_SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: GLOW_SIZE, height: GLOW_SIZE, borderRadius: GLOW_SIZE / 2, backgroundColor: palette.tint,
        borderWidth: 1, borderColor: palette.border }, glowStyle]} />
      <Animated.View style={emojiStyle}><AnimatedEmoji emoji={MOODS[index]} size={EMOJI_SIZE} playing={selected} /></Animated.View>
    </View>
    {/* The label keeps its space when hidden, so choosing a mood never shifts the row. */}
    <Animated.View style={labelStyle}>
      <Text variant="caption1" weight="semibold" numberOfLines={1} style={{ color: palette.accent }}>{MOOD_LABELS[index]}</Text>
    </Animated.View>
  </PressableScale>;
}
export function JournalEditor({ date, initial }: { date: string; initial: DiaryEntry | null }) {
  const theme = useTheme();
  const [text, setText] = useState(initial?.text ?? '');
  const [mood, setMood] = useState<number | null>(initial?.mood ?? null);
  const save = useAutosave<{ text: string; mood: number | null }>((draft) => saveJournal(date, draft.text, draft.mood));
  return <Card style={{ gap: theme.spacing.md }}>
    <Text variant="headline">How was today?</Text>
    <TextField appearance="bare" value={text} multiline placeholder="A few words about your day…" accessibilityLabel="Journal entry"
      onChangeText={(value) => { setText(value); save({ text: value, mood }); }} />
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row' }}>
      {MOODS.map((emoji, index) => <MoodButton key={emoji} index={index} selected={mood === index} dimmed={mood !== null && mood !== index}
        onPress={() => { const next = mood === index ? null : index; setMood(next); save({ text, mood: next }); }}
      />)}
    </View>
  </Card>;
}
