import { useState } from 'react';
import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useAutosave } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { saveJournal, type DiaryEntry } from '@/lib/repos/diary';

const MOODS = ['😞', '😐', '🙂', '😄', '🤩'];
export function JournalEditor({ date, initial }: { date: string; initial: DiaryEntry | null }) {
  const theme = useTheme();
  const [text, setText] = useState(initial?.text ?? '');
  const [mood, setMood] = useState<number | null>(initial?.mood ?? null);
  const save = useAutosave<{ text: string; mood: number | null }>((draft) => saveJournal(date, draft.text, draft.mood));
  return <Card style={{ gap: theme.spacing.md }}>
    <Text variant="headline">How was today?</Text>
    <TextField appearance="bare" value={text} multiline placeholder="A few words about your day…" accessibilityLabel="Journal entry"
      onChangeText={(value) => { setText(value); save({ text: value, mood }); }} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {MOODS.map((emoji, index) => <PressableScale key={emoji} haptic="selection" accessibilityLabel={`Mood ${index + 1} of 5`} accessibilityState={{ selected: mood === index }}
        onPress={() => { const next = mood === index ? null : index; setMood(next); save({ text, mood: next }); }}
        style={{ padding: theme.spacing.sm, borderRadius: theme.radii.pill, backgroundColor: mood === index ? theme.colors.fill : 'transparent', opacity: mood === index ? 1 : 0.6 }}>
        <Text variant="title1">{emoji}</Text>
      </PressableScale>)}
    </View>
  </Card>;
}
