import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useAutosave } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { animateTo } from '@/lib/animation';
import { saveJournal, type DiaryEntry } from '@/lib/repos/diary';

const MOODS = ['😞', '😐', '🙂', '😄', '🤩'];
const MOOD_LABELS = ['Very low', 'Low', 'Okay', 'Good', 'Great'];

function MoodButton({ index, selected, onPress }: { index: number; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);
  const { fill } = theme.colors;
  useEffect(() => { progress.set(animateTo(selected ? 1 : 0, 'snappy', reduced)); }, [progress, reduced, selected]);
  const style = useAnimatedStyle(() => ({ opacity: 0.6 + progress.get() * 0.4, backgroundColor: interpolateColor(progress.get(), [0, 1], ['transparent', fill]) }));
  return <PressableScale haptic="selection" accessibilityLabel={MOOD_LABELS[index]} accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress}>
    <Animated.View style={[{ padding: theme.spacing.sm, borderRadius: theme.radii.pill }, style]}><Text variant="title1">{MOODS[index]}</Text></Animated.View>
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
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {MOODS.map((emoji, index) => <MoodButton key={emoji} index={index} selected={mood === index}
        onPress={() => { const next = mood === index ? null : index; setMood(next); save({ text, mood: next }); }}
      />)}
    </View>
  </Card>;
}
