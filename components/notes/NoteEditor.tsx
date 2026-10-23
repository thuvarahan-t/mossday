import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Keyboard, ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LoadState } from '@/components/ui/LoadState';
import { ReorderableRow } from '@/components/ui/ReorderableRow';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { StrikeText } from '@/components/ui/StrikeText';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { GlassSurface } from '@/components/ui/glass/GlassSurface';
import { PressableScale } from '@/components/ui/PressableScale';
import { VoicePlayer } from '@/components/ui/voice/VoicePlayer';
import { VoiceRecorder } from '@/components/ui/voice/VoiceRecorder';
import { useAction, useAutosave, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { formatTimestamp } from '@/lib/date';
import { importMedia, mediaFile, reclaimMediaLater } from '@/lib/media';
import { importNotePhoto } from '@/lib/images';
import { checklistItems, deleteNote, getNote, notePreview, saveNote, type Note, type NoteBlock, type NoteDraft } from '@/lib/repos/notes';

const TOOLBAR: { icon: IconName; label: string }[] = [
  { icon: 'edit', label: 'Add text' }, { icon: 'image', label: 'Add photo from gallery' },
  { icon: 'camera', label: 'Take photo' }, { icon: 'mic', label: 'Record voice note' }, { icon: 'checklist', label: 'Add checklist' },
];

const emptyTextBlock = (noteId: number): NoteBlock =>
  ({ id: -1, noteId, type: 'TEXT', content: '', filePath: null, durationMs: null, position: 0 });

function isEmptyDraft(draft: NoteDraft) {
  return !draft.title.trim() && draft.blocks.every((block) => block.type === 'TEXT' && !block.content?.trim());
}

function Editor({ note, blocks }: { note: Note; blocks: NoteBlock[] }) {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();
  const keyboardPadding = useAnimatedStyle(() => ({ paddingBottom: Math.max(0, keyboard.height.get() - insets.bottom) }));
  // A new note opens on an empty text block so typing can start right away; it is only
  // stored once something is written.
  const [draft, setDraft] = useState<NoteDraft>(() => ({ ...note, blocks: blocks.length ? blocks : [emptyTextBlock(note.id)] }));
  const latest = useRef(draft);
  const nextId = useRef(-2);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const autosave = useAutosave<NoteDraft>((value) => saveNote(note.id, value));
  // Leaving a note without any content removes it instead of keeping a blank card.
  useEffect(() => () => { if (isEmptyDraft(latest.current)) void deleteNote(note.id).catch(() => undefined); }, [note.id]);
  const edit = (next: NoteDraft) => { latest.current = next; setDraft(next); autosave(next); };
  const changeBlock = (id: number, content: string) => edit({ ...latest.current, blocks: latest.current.blocks.map((b) => b.id === id ? { ...b, content } : b) });
  const addBlock = (type: NoteBlock['type'], filePath: string | null = null, durationMs: number | null = null) => {
    const block: NoteBlock = { id: nextId.current--, noteId: note.id, type, content: type === 'CHECKLIST' ? '[{"text":"","done":false}]' : '', filePath, durationMs, position: latest.current.blocks.length };
    edit({ ...latest.current, blocks: [...latest.current.blocks, block] });
  };
  const addImage = async (camera: boolean) => {
    if (busy) return;
    setBusy(true);
    await action(async () => {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) throw new Error('Allow camera access in Settings to take a photo.');
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: true };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const path = await importNotePhoto(asset);
      addBlock('IMAGE', path);
    });
    setBusy(false);
  };
  const saveAndLeave = () => {
    if (busy) return;
    setBusy(true);
    void action(() => saveNote(note.id, latest.current), () => router.back()).finally(() => setBusy(false));
  };
  const runTool = (icon: IconName) => {
    if (icon === 'edit') addBlock('TEXT');
    else if (icon === 'checklist') addBlock('CHECKLIST');
    else if (icon === 'mic') setRecording(true);
    else void addImage(icon === 'camera');
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
    {/* Follows the keyboard frame directly: Android may neither resize the window nor report
        coordinates that KeyboardAvoidingView can use (Expo Go draws below the status bar). */}
    <Animated.View style={[{ flex: 1 }, keyboardPadding]}>
      <View style={[styles.row, { justifyContent: 'space-between', padding: theme.spacing.lg, gap: theme.spacing.sm }]}>
        <GlassButton accessibilityLabel="Save and go back" onPress={saveAndLeave}><Icon name="chevronLeft" size={theme.sizes.iconLarge} /></GlassButton>
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          <GlassSurface contentStyle={[styles.row, { height: theme.sizes.circleButton, paddingHorizontal: theme.spacing.lg, gap: theme.spacing.xl }]}>
            <PressableScale haptic="selection" hitSlop={theme.spacing.sm} accessibilityLabel={draft.isPinned ? 'Unpin note' : 'Pin note'}
              accessibilityState={{ selected: !!draft.isPinned }} onPress={() => edit({ ...latest.current, isPinned: draft.isPinned ? 0 : 1 })}>
              <Icon name="pin" color={draft.isPinned ? 'accent' : 'label'} fill={draft.isPinned ? theme.colors.accent : undefined} />
            </PressableScale>
            <PressableScale haptic="tap" hitSlop={theme.spacing.sm} accessibilityLabel="Share note"
              onPress={() => { void action(async () => { await saveNote(note.id, latest.current); await Share.share({ message: `${latest.current.title}

${notePreview(latest.current.blocks)}` }); }); }}>
              <Icon name="share" />
            </PressableScale>
          </GlassSurface>
          <PressableScale haptic="success" accessibilityLabel="Done" disabled={busy} onPress={() => { Keyboard.dismiss(); saveAndLeave(); }}
            style={[styles.center, { width: theme.sizes.circleButton, height: theme.sizes.circleButton, borderRadius: theme.radii.pill, backgroundColor: theme.colors.accent }]}>
            <Icon name="check" color="onAccent" strokeWidth={2.8} />
          </PressableScale>
        </View>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.lg }}>
        <Text align="center" variant="footnote" color="secondaryLabel">{formatTimestamp(note.createdAt)}</Text>
        <TextField value={draft.title} onChangeText={(title) => edit({ ...latest.current, title })} appearance="bare" variant="largeTitle" bold placeholder="Heading" accessibilityLabel="Note heading" multiline />
        {draft.blocks.map((block, index) => <ReorderableRow key={block.id} label={`Reorder ${block.type.toLowerCase()} block`} onMove={(offset) => {
          const reordered = [...latest.current.blocks]; const from = reordered.findIndex((b) => b.id === block.id);
          const [moved] = reordered.splice(from, 1); reordered.splice(Math.max(0, Math.min(reordered.length, from + offset)), 0, moved);
          edit({ ...latest.current, blocks: reordered });
        }}><SwipeableRow onDelete={() => {
          edit({ ...latest.current, blocks: latest.current.blocks.filter((b) => b.id !== block.id) });
          if (block.filePath) reclaimMediaLater([block.filePath]);
          toast({ message: 'Block deleted', actionLabel: 'Undo', onAction: () => {
            const restored = [...latest.current.blocks]; restored.splice(Math.min(index, restored.length), 0, block); edit({ ...latest.current, blocks: restored });
          } });
        }}>
          <View style={{ paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.background }}>
            {block.type === 'TEXT' && <TextField appearance="bare" multiline placeholder="Write something…" value={block.content ?? ''} onChangeText={(text) => changeBlock(block.id, text)} accessibilityLabel="Note text" />}
            {block.type === 'IMAGE' && block.filePath && <Image source={{ uri: mediaFile(block.filePath).uri }} style={{ width: '100%', height: theme.sizes.habitRing * 3, borderRadius: theme.radii.card }} resizeMode="cover" accessibilityLabel="Attached photo" />}
            {block.type === 'VOICE' && block.filePath && <VoicePlayer uri={mediaFile(block.filePath).uri} durationMs={block.durationMs ?? 0} />}
            {block.type === 'CHECKLIST' && <View style={{ gap: theme.spacing.sm }}>
              {checklistItems(block.content).map((item, itemIndex) => <View key={itemIndex} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Checkbox checked={item.done} accessibilityLabel={item.text || 'Checklist item'} onToggle={() => {
                  const items = checklistItems(block.content); items[itemIndex] = { ...item, done: !item.done }; changeBlock(block.id, JSON.stringify(items));
                }} />
                <View style={{ flex: 1 }}>{item.done ? <StrikeText struck>{item.text}</StrikeText> : <TextField value={item.text} appearance="bare" placeholder="List item" accessibilityLabel="Checklist text" onChangeText={(text) => {
                  const items = checklistItems(block.content); items[itemIndex] = { ...item, text }; changeBlock(block.id, JSON.stringify(items));
                }} />}</View>
                <Button title="×" size="small" variant="plain" onPress={() => changeBlock(block.id, JSON.stringify(checklistItems(block.content).filter((_, i) => i !== itemIndex)))} />
              </View>)}
              <Button title="Add item" size="small" variant="plain" onPress={() => changeBlock(block.id, JSON.stringify([...checklistItems(block.content), { text: '', done: false }]))} />
            </View>}
          </View>
        </SwipeableRow></ReorderableRow>)}
      </ScrollView>
      {recording ? <VoiceRecorder onCancel={() => setRecording(false)} onError={(message) => toast({ message })} onSave={(uri, durationMs) => {
        void action(async () => { const path = importMedia(uri, 'm4a'); addBlock('VOICE', path, durationMs); setRecording(false); });
      }} /> : <GlassSurface style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }}
        contentStyle={[styles.row, { justifyContent: 'space-around', height: theme.sizes.toolbarHeight }]}>
        {TOOLBAR.map((item) => <PressableScale key={item.label} haptic="selection" accessibilityLabel={item.label} disabled={busy} hitSlop={theme.spacing.sm}
          style={[styles.center, { minWidth: theme.sizes.circleButton, height: theme.sizes.circleButton }]} onPress={() => runTool(item.icon)}>
          {item.icon === 'edit' ? <Text variant="headline">Aa</Text> : <Icon name={item.icon} />}
        </PressableScale>)}
      </GlassSurface>}
    </Animated.View>
  </SafeAreaView>;
}

export function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data, error, refresh } = useResource(useCallback(() => getNote(Number(id)), [id]));
  // The editor owns its draft after loading. Store events must not remount it while typing.
  return data?.note ? <Editor key={id} note={data.note} blocks={data.blocks} /> :
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Button title="Back" variant="plain" onPress={() => router.back()} />
      {data ? <Text align="center">This note is no longer available.</Text> : <LoadState error={error} retry={refresh} />}
    </SafeAreaView>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
