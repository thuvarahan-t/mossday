import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { VoicePlayer } from '@/components/ui/voice/VoicePlayer';
import { VoiceRecorder } from '@/components/ui/voice/VoiceRecorder';
import { useAction, useAutosave, useResource } from '@/hooks/useResource';
import { useTheme } from '@/hooks/useTheme';
import { formatTimestamp } from '@/lib/date';
import { importMedia, mediaFile, reclaimMediaLater } from '@/lib/media';
import { importNotePhoto } from '@/lib/images';
import { checklistItems, getNote, notePreview, saveNote, type Note, type NoteBlock, type NoteDraft } from '@/lib/repos/notes';

const TOOLBAR: { icon: IconName; label: string }[] = [
  { icon: 'edit', label: 'Add text' }, { icon: 'image', label: 'Add photo from gallery' },
  { icon: 'camera', label: 'Take photo' }, { icon: 'mic', label: 'Record voice note' }, { icon: 'checklist', label: 'Add checklist' },
];

function Editor({ note, blocks }: { note: Note; blocks: NoteBlock[] }) {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  const [draft, setDraft] = useState<NoteDraft>({ ...note, blocks });
  const latest = useRef(draft);
  const nextId = useRef(-1);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const autosave = useAutosave<NoteDraft>((value) => saveNote(note.id, value));
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.lg, gap: theme.spacing.sm }}>
        <GlassButton accessibilityLabel="Save and go back" onPress={saveAndLeave}><Icon name="chevronLeft" /></GlassButton>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <GlassButton accessibilityLabel={draft.isPinned ? 'Unpin note' : 'Pin note'} onPress={() => edit({ ...latest.current, isPinned: draft.isPinned ? 0 : 1 })}><Icon name="pin" color={draft.isPinned ? 'accent' : 'label'} /></GlassButton>
          <GlassButton accessibilityLabel="Share note" onPress={() => { void action(async () => { await saveNote(note.id, latest.current); await Share.share({ message: `${latest.current.title}\n\n${notePreview(latest.current.blocks)}` }); }); }}><Icon name="share" /></GlassButton>
          <GlassButton accessibilityLabel="Done" disabled={busy} onPress={saveAndLeave}><Icon name="check" color="accent" /></GlassButton>
        </View>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.lg }}>
        <Text align="center" variant="footnote" color="secondaryLabel">{formatTimestamp(note.createdAt)}</Text>
        <TextField value={draft.title} onChangeText={(title) => edit({ ...latest.current, title })} appearance="bare" variant="largeTitle" bold placeholder="Heading" accessibilityLabel="Note heading" multiline />
        {!draft.blocks.length && <Button title="Start writing" variant="plain" onPress={() => addBlock('TEXT')} />}
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
        <Text variant="caption1" color="secondaryLabel">Changes save automatically on this device.</Text>
      </ScrollView>
      {recording ? <VoiceRecorder onCancel={() => setRecording(false)} onError={(message) => toast({ message })} onSave={(uri, durationMs) => {
        void action(async () => { const path = importMedia(uri, 'm4a'); addBlock('VOICE', path, durationMs); setRecording(false); });
      }} /> : <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: theme.spacing.sm, backgroundColor: theme.colors.secondaryBackground }}>
        {TOOLBAR.map((item) => <GlassButton key={item.label} accessibilityLabel={item.label} disabled={busy} onPress={() => runTool(item.icon)}><Icon name={item.icon} /></GlassButton>)}
      </View>}
    </KeyboardAvoidingView>
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
