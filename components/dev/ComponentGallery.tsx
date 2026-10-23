import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { BarChart } from '@/components/ui/BarChart';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chip } from '@/components/ui/Chip';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { DatePill } from '@/components/ui/DatePill';
import { EmptyState } from '@/components/ui/EmptyState';
import { GroupedList, ListRow, SectionHeader, SectionTitle } from '@/components/ui/GroupedList';
import { Heatmap } from '@/components/ui/Heatmap';
import { Icon } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/IconTile';
import { MonthGrid } from '@/components/ui/MonthGrid';
import { NumberKeypad } from '@/components/ui/NumberKeypad';
import { OptionsBar } from '@/components/ui/OptionsBar';
import { SwatchPicker, WeekdayPicker } from '@/components/ui/Pickers';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Stepper } from '@/components/ui/Stepper';
import { StrikeText } from '@/components/ui/StrikeText';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { Text } from '@/components/ui/Text';
import { SearchField, TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { Toggle } from '@/components/ui/Toggle';
import { WeekStrip } from '@/components/ui/WeekStrip';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { BottomSheet } from '@/components/ui/sheet/BottomSheet';
import { SheetHeader, SheetIconButton } from '@/components/ui/sheet/SheetHeader';
import { Waveform, waveformFromSeed } from '@/components/ui/voice/Waveform';
import { VoicePlayer } from '@/components/ui/voice/VoicePlayer';
import { VoiceRecorder } from '@/components/ui/voice/VoiceRecorder';
import { HabitsWidgetPreview, SpendWidgetPreview } from '@/components/widgets/WidgetPreview';
import type { AccentName } from '@/constants/colors';
import { textVariants, type TextVariant } from '@/constants/typography';
import { ColorSchemeOverride, useTheme } from '@/hooks/useTheme';
import { addDays, startOfWeek, todayLocalDate } from '@/lib/date';
import { formatMoney, applyKeypadKey } from '@/lib/money';

const SWATCHES: AccentName[] = ['green', 'blue', 'indigo', 'orange', 'pink', 'teal'];

/** Deterministic sample history so the heatmap looks the same on every reload. */
function sampleCounts(today: string, days: number) {
  const counts: Record<string, number> = {};
  for (let index = 0; index < days; index += 1) counts[addDays(today, -index)] = (index * 7 + 3) % 5;
  return counts;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View>
      <SectionHeader title={title} />
      <Card style={{ gap: theme.spacing.lg }}>{children}</Card>
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={[styles.row, { gap: theme.spacing.md }]}>{children}</View>;
}

/** Every shared component in its states, rendered once per colour scheme. */
function Gallery() {
  const theme = useTheme();
  const showToast = useToast();
  const today = todayLocalDate();
  const [segment, setSegment] = useState<'Day' | 'Week' | 'Month'>('Day');
  const [toggle, setToggle] = useState(true);
  const [count, setCount] = useState(1);
  const [checked, setChecked] = useState(false);
  const [total, setTotal] = useState(125000);
  const [chip, setChip] = useState('Lunch');
  const [input, setInput] = useState('450');
  const [search, setSearch] = useState('');
  const [swatch, setSwatch] = useState<AccentName>('green');
  const [mask, setMask] = useState(0b1011111);
  const [selectedDay, setSelectedDay] = useState(today);
  const [sheet, setSheet] = useState<'none' | 'content' | 'large'>('none');
  const [rows, setRows] = useState(['Bus', 'Breakfast', 'Lunch']);
  const [showRecorder, setShowRecorder] = useState(false);
  const [voice, setVoice] = useState<{ uri: string; durationMs: number } | null>(null);
  const counts = sampleCounts(today, 140);

  return (
    <View style={{ paddingBottom: theme.spacing.xxxl, backgroundColor: theme.colors.groupedBackground }}>
      <Text variant="title2" style={{ paddingHorizontal: theme.sizes.titleInset, paddingTop: theme.spacing.xxl }}>
        {theme.isDark ? 'Dark' : 'Light'}
      </Text>

      <Section title="Text">
        {(Object.keys(textVariants) as TextVariant[]).map((variant) => (
          <Text key={variant} variant={variant} numberOfLines={1}>{variant} · Rs. 1,250</Text>
        ))}
      </Section>

      <Section title="Buttons & chips">
        <Button title="Save" onPress={() => undefined} fullWidth />
        <Row>
          <Button title="Add" size="small" onPress={() => undefined} />
          <Button title="Cancel" variant="tinted" size="small" onPress={() => undefined} />
          <Button title="See All" variant="plain" size="small" onPress={() => undefined} />
          <Button title="Off" size="small" disabled onPress={() => undefined} />
        </Row>
        <Row>
          {['Breakfast', 'Lunch', 'Dinner'].map((label) => (
            <Chip key={label} label={label} selected={chip === label} onPress={() => setChip(label)} />
          ))}
        </Row>
      </Section>

      <Section title="Controls">
        <SegmentedControl segments={['Day', 'Week', 'Month'] as const} selected={segment} onChange={setSegment} />
        <Row>
          <Toggle value={toggle} onValueChange={setToggle} accessibilityLabel="Sample toggle" />
          <Toggle value={!toggle} onValueChange={(value) => setToggle(!value)} accessibilityLabel="Inverse toggle" />
          <Toggle value={false} disabled onValueChange={() => undefined} accessibilityLabel="Disabled toggle" />
          <Stepper value={count} min={1} onChange={setCount} accessibilityLabel="Times a day" />
        </Row>
        <Row>
          <Checkbox checked={checked} onToggle={() => setChecked(!checked)} accessibilityLabel="Sample to-do" />
          <StrikeText struck={checked}>Submit IN 2511 lab sheet</StrikeText>
        </Row>
        <SwatchPicker colors={SWATCHES} selected={swatch} onSelect={setSwatch} />
        <WeekdayPicker mask={mask} onChange={setMask} />
      </Section>

      <Section title="Numbers & progress">
        <AnimatedNumber value={total} format={formatMoney} />
        <Row>
          <Button title="+ Rs. 450" size="small" variant="tinted" onPress={() => setTotal(total + 45000)} />
          <Button title="Reset" size="small" variant="plain" onPress={() => setTotal(125000)} />
        </Row>
        <ProgressBar progress={0.62} />
        <ProgressBar progress={0.9} color={theme.colors.warning} />
        <ProgressBar progress={1} color={theme.colors.danger} />
        <Row>
          <ProgressRing progress={5 / 8}><Text variant="footnote" weight="semibold">5/8</Text></ProgressRing>
          <ProgressRing progress={1}><Text>💧</Text></ProgressRing>
          <ProgressRing progress={0} />
        </Row>
      </Section>

      <Section title="Heatmap">
        <Heatmap startDate={addDays(startOfWeek(today), -19 * 7)} weeks={20} counts={counts} today={today} outlinedDate={today} />
        <Heatmap
          startDate={addDays(startOfWeek(today), -8 * 7)} weeks={12} counts={counts} today={today} future="faint"
          showMonthLabels outlinedDate={selectedDay} onSelectDate={setSelectedDay} activeDays={0b0011111}
        />
      </Section>

      <Section title="Icons & glass">
        <Row>
          {(['home', 'wallet', 'habits', 'calendar', 'note', 'settings'] as const).map((name) => <Icon key={name} name={name} />)}
        </Row>
        <Row>
          <IconTile icon="utensils" color="orange" />
          <IconTile icon="bus" color="blue" />
          <IconTile icon="tag" color="purple" />
          <IconTile icon="plus" color="gray" neutral />
          <GlassButton accessibilityLabel="Settings"><Icon name="settings" /></GlassButton>
          <GlassButton shape="pill" accessibilityLabel="Edit"><Text>Edit</Text></GlassButton>
        </Row>
      </Section>

      <SectionTitle title="Lists" trailing={<Button title="See All" variant="plain" size="small" onPress={() => undefined} />} />
      <GroupedList>
        {rows.map((title) => (
          <SwipeableRow key={title} onDelete={() => {
            setRows((current) => current.filter((row) => row !== title));
            showToast({ message: 'Expense deleted', actionLabel: 'Undo', onAction: () => setRows((current) => [...current, title]) });
          }}>
            <ListRow title={title} subtitle="12:50" icon={{ icon: 'utensils', color: 'orange' }} value="Rs. 450" onPress={() => undefined} />
          </SwipeableRow>
        ))}
        <ListRow title="Daily Budget" icon={{ icon: 'target', color: 'orange' }} value="Rs. 2,000" accessory="chevron" onPress={() => undefined} />
        <ListRow title="Breakfast" icon={{ icon: 'coffee', color: 'orange' }} value="9:00"
          accessory={<Toggle value={toggle} onValueChange={setToggle} accessibilityLabel="Breakfast reminder" />} />
      </GroupedList>

      <Section title="Context menu, toast & sheets">
        <ContextMenu
          accessibilityLabel="Sample note"
          actions={[
            { label: 'Pin', icon: 'pin', onPress: () => showToast({ message: 'Pinned' }) },
            { label: 'Delete', icon: 'trash', destructive: true, onPress: () => showToast({ message: 'Deleted', actionLabel: 'Undo' }) },
          ]}
        >
          <View style={{ padding: theme.spacing.lg, borderRadius: theme.radii.card, backgroundColor: theme.colors.fill }}>
            <Text variant="headline">Long-press me</Text>
            <Text color="secondaryLabel">Context menu</Text>
          </View>
        </ContextMenu>
        <Row>
          <Button title="Toast" size="small" variant="tinted" onPress={() => showToast({ message: 'Expense deleted', actionLabel: 'Undo' })} />
          <Button title="Sheet" size="small" variant="tinted" onPress={() => setSheet('content')} />
          <Button title="Large sheet" size="small" variant="tinted" onPress={() => setSheet('large')} />
        </Row>
      </Section>

      <Section title="Amount entry">
        <AmountDisplay input={input} />
        <OptionsBar cells={[
          { label: 'Today', onPress: () => undefined },
          { label: 'Cash', onPress: () => undefined },
          { label: 'Add note', tinted: true, onPress: () => undefined },
        ]} />
        <NumberKeypad onKey={(key) => setInput((current) => applyKeypadKey(current, key))} onClear={() => setInput('')} />
      </Section>

      <Section title="Fields">
        <TextField placeholder="What was it?" />
        <TextField appearance="filled" placeholder="Filled field" />
        <SearchField value={search} onChangeText={setSearch} />
      </Section>

      <Section title="Dates & charts">
        <DatePill date={selectedDay} today={today} onPress={() => setSelectedDay(addDays(selectedDay, -1))} />
        <WeekStrip weekStart={startOfWeek(selectedDay)} selected={selectedDay} today={today}
          markedDates={new Set([today, addDays(today, -1)])} onSelect={setSelectedDay}
          onChangeWeek={(delta) => setSelectedDay(addDays(selectedDay, delta * 7))} />
        <MonthGrid month={today} today={today} selected={selectedDay} onSelect={setSelectedDay}
          spendLevels={Object.fromEntries(Object.entries(counts).map(([date, value]) => [date, value]))}
          todoDates={new Set([today, addDays(today, -2)])} />
        <BarChart
          values={Array.from({ length: 31 }, (_, index) => (index > 21 ? null : ((index * 37) % 9 + 3) * 10000))}
          highlightIndex={21}
          labels={[0, 7, 14, 21, 30].map((index) => ({ index, text: String(index + 1) }))}
          accessibilityLabel="Sample month chart"
        />
        <Waveform bars={waveformFromSeed('sample', 28)} progress={0.3} activeColor={theme.colors.accent} inactiveColor={theme.colors.tertiaryLabel} />
      </Section>

      <Section title="Widgets">
        <SpendWidgetPreview spentCents={125000} leftCents={75000}
          meals={[{ label: 'Breakfast', amountCents: 25000 }, { label: 'Lunch', amountCents: 45000 }, { label: 'Dinner', amountCents: null }]} />
        <HabitsWidgetPreview done={3} total={4} hint="Water left · 5 of 8" />
      </Section>

      <Section title="Voice notes">
        <Text variant="footnote" color="secondaryLabel">Record a sample to test microphone access, slide-to-cancel, and playback.</Text>
        {voice && <VoicePlayer uri={voice.uri} durationMs={voice.durationMs} />}
        {showRecorder ? (
          <>
            <VoiceRecorder
              onSave={(uri, durationMs) => { setVoice({ uri, durationMs }); setShowRecorder(false); }}
              onCancel={() => setShowRecorder(false)}
              onError={(message) => showToast({ message })}
            />
            <Button title="Close recorder" variant="plain" onPress={() => setShowRecorder(false)} />
          </>
        ) : <Button title="Record sample" variant="tinted" onPress={() => setShowRecorder(true)} />}
      </Section>

      <Section title="Empty state">
        <EmptyState icon="habits" title="No habits yet" message="Start with one small thing, like 8 glasses of water."
          action={{ label: 'New Habit', onPress: () => undefined }} />
      </Section>

      <BottomSheet visible={sheet !== 'none'} onClose={() => setSheet('none')}
        detents={sheet === 'large' ? ['medium', 'large'] : ['content']} background="grouped">
        <SheetHeader title="Add" trailing={<SheetIconButton icon="close" accessibilityLabel="Close" onPress={() => setSheet('none')} />} />
        <GroupedList separatorInset={theme.sizes.rowPadding + theme.sizes.iconTileLarge + theme.spacing.md}>
          <ListRow title="Expense" subtitle="A meal or anything you paid for" icon={{ icon: 'wallet', color: 'orange' }} accessory="chevron" onPress={() => undefined} />
          <ListRow title="To-do" subtitle="Adds to today in your diary" icon={{ icon: 'todo', color: 'indigo' }} accessory="chevron" onPress={() => undefined} />
        </GroupedList>
      </BottomSheet>
    </View>
  );
}

export function ComponentGallery() {
  return (
    <>
      <ColorSchemeOverride.Provider value="light"><Gallery /></ColorSchemeOverride.Provider>
      <ColorSchemeOverride.Provider value="dark"><Gallery /></ColorSchemeOverride.Provider>
    </>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' } });
