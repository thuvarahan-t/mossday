import { View } from 'react-native';
import { ShareCheck } from '@/components/share/ShareCheck';
import { ShareLine, SharePanel, type ShareContent } from '@/components/share/ShareCard';
import { checkLine, joinSections } from '@/components/share/shareText';
import { Emoji } from '@/components/ui/Emoji';
import { Text } from '@/components/ui/Text';
import type { Theme } from '@/constants/theme';
import { dayOfMonth, monthName, weekdayName } from '@/lib/date';
import type { DiaryEntry, Todo } from '@/lib/repos/diary';
import { MOODS } from './JournalEditor';

/** Diary page as an image: the day's to-dos, journal and mood, and its one-line summary. */
export function diaryShareContent({ theme, date, todos, journal, summary }: {
  theme: Theme; date: string; todos: Todo[]; journal: DiaryEntry | null; summary: string;
}): ShareContent {
  return {
    icon: 'calendar',
    title: `${dayOfMonth(date)} ${monthName(date)}`,
    subtitle: `${weekdayName(date)}, ${date.slice(0, 4)}`,
    text: joinSections(`${weekdayName(date)}, ${dayOfMonth(date)} ${monthName(date)} ${date.slice(0, 4)}`,
      todos.length > 0 && todos.map((todo) => checkLine(todo.text, todo.isDone)).join('\n'),
      journal?.text, summary),
    body: <View style={{ gap: theme.spacing.md }}>
      {todos.length > 0 && <SharePanel>
        {todos.map((todo) => <ShareLine key={todo.id} title={todo.text} muted={!!todo.isDone} value={todo.time ?? undefined} leading={<ShareCheck done={!!todo.isDone} />} />)}
      </SharePanel>}
      {(journal?.text || journal?.mood !== null && journal?.mood !== undefined) && <SharePanel gap={theme.spacing.sm}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="headline">How was today?</Text>
          {journal.mood !== null && <Emoji emoji={MOODS[journal.mood]} size={28} />}
        </View>
        {journal.text ? <Text>{journal.text}</Text> : null}
      </SharePanel>}
      <Text variant="subheadline" color="secondaryLabel" align="center">{summary}</Text>
    </View>,
  };
}
