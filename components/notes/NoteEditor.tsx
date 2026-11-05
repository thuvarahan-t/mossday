import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShare } from '@/components/share/ShareProvider';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LoadState } from '@/components/ui/LoadState';
import { DragScrollView, type RevealCaret } from '@/components/ui/DragScrollView';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { GlassButton } from '@/components/ui/glass/GlassButton';
import { GlassSurface } from '@/components/ui/glass/GlassSurface';
import { PressableScale } from '@/components/ui/PressableScale';
import { VoicePlayer } from '@/components/ui/voice/VoicePlayer';
import { VoiceRecorder } from '@/components/ui/voice/VoiceRecorder';
import { useAction, useAutosave, useResource } from '@/hooks/useResource';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useSheetState } from '@/hooks/useSheetState';
import { useTheme } from '@/hooks/useTheme';
import { dataColors } from '@/lib/dataColors';
import { formatRelativeTimestamp, formatTimestamp } from '@/lib/date';
import { haptics } from '@/lib/haptics';
import { importNotePhoto } from '@/lib/images';
import { importMedia, mediaFile, reclaimMediaLater } from '@/lib/media';
import { ensureReminderPermission } from '@/lib/reminders';
import {
  checklistItems, deleteNote, duplicateNote, getNote, listNoteFolders, restoreNote, saveNote, setNoteArchived, setNoteReminder,
  type Note, type NoteBlock, type NoteDraft,
} from '@/lib/repos/notes';
import { ChecklistBlock } from './ChecklistBlock';
import { emptyHistory, recordEdit, redo, undo } from './draftHistory';
import { drawingViewBox, eraseFromDrawing, parseDrawing, serializeDrawing, strokesBox, type InkColor, type Stroke } from './drawing';
import { DrawingTools } from './DrawingTools';
import { DrawingView } from './DrawingView';
import type { InkTool } from './InkLayer';
import { checklistToText, continueList, noteCounts, textToChecklist, toggleList, type ListKind } from './noteText';
import { NoteOptionsSheet } from './NoteOptionsSheet';
import { noteShareContent } from './notesShare';
import { NoteTag } from './NoteTag';
import { PhotoViewer } from './PhotoViewer';
import { ReminderSheet } from './ReminderSheet';
import { formatReminder } from './reminderTimes';
import { NoteCanvas } from './NoteCanvas';
import { insertCanvasBlock, serializeBlockLayout, type BlockFrame, type BlockLayout } from '@/lib/noteCanvas';

type ToolId = 'format' | 'gallery' | 'camera' | 'voice' | 'checklist' | 'drawing' | 'tools' | 'text' | 'bullets' | 'numbers' | 'checkboxes' | 'timestamp';
type Tool = { id: ToolId; icon: IconName; label: string };
const INSERT_TOOLS: Tool[] = [
  { id: 'format', icon: 'text', label: 'Format text' }, { id: 'gallery', icon: 'image', label: 'Add photo from gallery' },
  { id: 'camera', icon: 'camera', label: 'Take photo' }, { id: 'voice', icon: 'mic', label: 'Record voice note' },
  { id: 'checklist', icon: 'checklist', label: 'Add checklist' }, { id: 'drawing', icon: 'brush', label: 'Add drawing' },
];
/** Samsung's format bar, swapped in for the tools by "Aa". */
const FORMAT_TOOLS: Tool[] = [
  { id: 'tools', icon: 'chevronLeft', label: 'Back to tools' }, { id: 'text', icon: 'plus', label: 'Add text' },
  { id: 'bullets', icon: 'bulletList', label: 'Bulleted list' }, { id: 'numbers', icon: 'numberList', label: 'Numbered list' },
  { id: 'checkboxes', icon: 'checklist', label: 'Show or hide checkboxes' }, { id: 'timestamp', icon: 'clock', label: 'Insert date and time' },
];
type Focus = { blockId: number; selection: { start: number; end: number } };

const emptyTextBlock = (noteId: number): NoteBlock =>
  ({ id: -1, noteId, type: 'TEXT', content: '', filePath: null, durationMs: null, position: 0 });
const EMPTY_CHECKLIST = JSON.stringify([{ text: '', done: false }]);
/** Eraser reach, in page widths. */
const ERASER_RADIUS = 0.03;

function isEmptyDraft(draft: NoteDraft) {
  return !draft.title.trim() && draft.blocks.every((block) => block.type === 'TEXT' && !block.content?.trim());
}

function Editor({ note, blocks }: { note: Note; blocks: NoteBlock[] }) {
  const theme = useTheme();
  const action = useAction();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  const keyboardPadding = useAnimatedStyle(() => ({ paddingBottom: Math.max(0, keyboardHeight.get() - insets.bottom) }));
  // A new note opens on an empty text block so typing can start right away; it is only
  // stored once something is written.
  const [draft, setDraft] = useState<NoteDraft>(() => ({ ...note, blocks: blocks.length ? blocks : [emptyTextBlock(note.id)] }));
  const latest = useRef(draft);
  const history = useRef(emptyHistory<NoteDraft>());
  const [steps, setSteps] = useState(() => emptyHistory<NoteDraft>());
  const nextId = useRef(-2);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [manipulating, setManipulating] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const frames = useRef<Record<number, BlockFrame>>({});
  const revealCaret = useRef<RevealCaret>(null);
  /** The text block or checklist being typed in, for the format bar; null in the heading. */
  const focus = useRef<Focus | null>(null);
  const [autoFocusId, setAutoFocusId] = useState<number | null>(null);
  /** Where to put the cursor after the app changed the text being typed (a list marker, a time). */
  const [cursor, setCursor] = useState<{ blockId: number; at: number } | null>(null);
  const [reminderAt, setReminderAt] = useState(note.reminderAt);
  const [editedAt, setEditedAt] = useState(note.updatedAt);
  const [openedAt] = useState(() => Date.now());
  const [sheet, setSheet, sheetTransition] = useSheetState<'options' | 'reminder'>(true);
  const [drawingOn, setDrawingOn] = useState(false);
  const [inkTool, setInkTool] = useState<InkTool>('pen');
  const [inkColor, setInkColor] = useState<InkColor>('ink');
  /** The block this round of drawing adds to; each time the pen comes out starts a new one. */
  const inkBlock = useRef<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const folders = useResource(listNoteFolders).data ?? [];
  // Set once the note is deleted here, so edits still waiting to save are dropped.
  const gone = useRef(false);
  const autosave = useAutosave<NoteDraft>((value) => gone.current ? Promise.resolve() : saveNote(note.id, value));
  // Leaving a note without any content removes it instead of keeping a blank card.
  useEffect(() => () => { if (!gone.current && isEmptyDraft(latest.current)) void deleteNote(note.id).catch(() => undefined); }, [note.id]);

  const commit = (next: NoteDraft) => { latest.current = next; setDraft(next); autosave(next); setEditedAt(new Date().toISOString()); };
  /** Every change goes through here, so it can be undone; `group` merges a burst of typing. */
  const edit = (next: NoteDraft, group: string | null = null) => {
    history.current = recordEdit(history.current, latest.current, group);
    setSteps(history.current);
    commit(next);
  };
  const step = (direction: typeof undo) => {
    const result = direction(history.current, latest.current);
    if (!result) return;
    history.current = result.history;
    setSteps(result.history);
    focus.current = null;
    commit(result.draft);
  };
  const replaceBlock = (id: number, change: Partial<NoteBlock>, group: string | null = null) =>
    edit({ ...latest.current, blocks: latest.current.blocks.map((b) => b.id === id ? { ...b, ...change } : b) }, group);
  const newBlock = (type: NoteBlock['type'], content: string | null = '', filePath: string | null = null, durationMs: number | null = null): NoteBlock =>
    ({ id: nextId.current--, noteId: note.id, type, content, filePath, durationMs, position: 0 });
  const addBlock = (block: NoteBlock, focusIt = false, at?: BlockLayout) => {
    const current = latest.current;
    edit({ ...current, blocks: insertCanvasBlock(current.blocks, block, contentWidth, frames.current, selectedBlockId, at) });
    setSelectedBlockId(block.id);
    if (focusIt) setAutoFocusId(block.id);
  };
  const focused = () => {
    const current = focus.current;
    const block = current && latest.current.blocks.find((b) => b.id === current.blockId);
    return block && current ? { block, selection: current.selection } : null;
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
      addBlock(newBlock('IMAGE', '', await importNotePhoto(result.assets[0])));
    });
    setBusy(false);
  };
  // Samsung's format bar: lists, checkboxes and a time stamp act on the block being typed in,
  // or start a new block when the cursor is in the heading or nowhere.
  const formatList = (kind: ListKind) => {
    const current = focused();
    if (current?.block.type === 'TEXT') replaceBlock(current.block.id, { content: toggleList(current.block.content ?? '', current.selection, kind) });
    else addBlock(newBlock('TEXT', kind === 'bullet' ? '• ' : '1. '), true);
  };
  const toggleCheckboxes = () => {
    const current = focused();
    if (!current) { addBlock(newBlock('CHECKLIST', EMPTY_CHECKLIST), true); return; }
    focus.current = null;
    replaceBlock(current.block.id, current.block.type === 'TEXT'
      ? { type: 'CHECKLIST', content: JSON.stringify(textToChecklist(current.block.content ?? '')) }
      : { type: 'TEXT', content: checklistToText(checklistItems(current.block.content)) });
  };
  const insertTimestamp = () => {
    const stamp = formatTimestamp(new Date().toISOString());
    const current = focused();
    if (current?.block.type !== 'TEXT') { addBlock(newBlock('TEXT', stamp), true); return; }
    const text = current.block.content ?? '';
    const at = Math.min(current.selection.end, text.length);
    replaceBlock(current.block.id, { content: text.slice(0, at) + stamp + text.slice(at) });
    setCursor({ blockId: current.block.id, at: at + stamp.length });
  };
  const startDrawing = () => { Keyboard.dismiss(); inkBlock.current = null; setSelectedBlockId(null); setFormatting(false); setDrawingOn(true); };
  const addStroke = (stroke: Stroke) => {
    const current = latest.current;
    const existing = current.blocks.find((block) => block.id === inkBlock.current);
    const strokes = [...existing ? parseDrawing(existing.content).strokes : [], stroke];
    const box = strokesBox(strokes);
    // A new round always starts from where the strokes really are, so the block is the box.
    const change = { content: serializeDrawing({ aspect: box.height / box.width, strokes, box }),
      layout: serializeBlockLayout({ x: box.x, y: box.y * contentWidth, width: box.width, ratio: box.width / box.height }) };
    if (existing) { replaceBlock(existing.id, change); return; }
    const block = { ...newBlock('DRAWING'), ...change };
    inkBlock.current = block.id;
    edit({ ...current, blocks: [...current.blocks, block] });
  };
  const eraseAtPoint = (x: number, y: number) => {
    const current = latest.current;
    let changed = false;
    const blocks = current.blocks.flatMap((block) => {
      const frame = frames.current[block.id];
      if (block.type !== 'DRAWING' || !frame) return [block];
      const drawing = parseDrawing(block.content);
      const strokes = eraseFromDrawing(drawing, { x: frame.x, y: frame.y / contentWidth, width: frame.width }, x, y, ERASER_RADIUS);
      if (strokes.length === drawing.strokes.length) return [block];
      changed = true;
      return strokes.length ? [{ ...block, content: serializeDrawing({ ...drawing, box: drawingViewBox(drawing), strokes }) }] : [];
    });
    if (changed) edit({ ...current, blocks }, 'erase');
  };

  const runTool = (id: ToolId) => {
    // The pen's options stay out only while drawing: any other tool puts them away.
    if (id !== 'drawing') setDrawingOn(false);
    switch (id) {
      case 'format': setFormatting(true); break;
      case 'tools': setFormatting(false); break;
      case 'gallery': case 'camera': void addImage(id === 'camera'); break;
      case 'voice': setRecording(true); break;
      case 'checklist': addBlock(newBlock('CHECKLIST', EMPTY_CHECKLIST), true); break;
      case 'drawing': if (drawingOn) setDrawingOn(false); else startDrawing(); break;
      case 'text': addBlock(newBlock('TEXT'), true); break;
      case 'bullets': formatList('bullet'); break;
      case 'numbers': formatList('number'); break;
      case 'checkboxes': toggleCheckboxes(); break;
      case 'timestamp': insertTimestamp(); break;
    }
  };

  const saveAndLeave = () => {
    if (busy) return;
    setBusy(true);
    void action(() => saveNote(note.id, latest.current), () => router.back()).finally(() => setBusy(false));
  };
  const openShare = useShare();
  // The share choices are a sheet of their own, so they wait for this note's menu to close.
  const shareAfterMenu = useRef(false);
  const share = () => { void action(async () => {
    await saveNote(note.id, latest.current);
    shareAfterMenu.current = true;
    setSheet(null);
  }); };
  const copy = () => { void action(async () => {
    await saveNote(note.id, latest.current);
    const id = await duplicateNote(note.id);
    setSheet(null);
    router.replace({ pathname: '/note/[id]', params: { id } });
    toast({ message: 'Copy made' });
  }); };
  const archive = () => {
    const archived = !note.isArchived;
    void action(async () => {
      await saveNote(note.id, latest.current);
      await setNoteArchived(note.id, archived);
    }, () => {
      setSheet(null);
      router.back();
      toast({ message: archived ? 'Note archived' : 'Note unarchived', actionLabel: 'Undo', onAction: () => { void action(() => setNoteArchived(note.id, !archived)); } });
    });
  };
  const remove = () => { void action(async () => {
    await saveNote(note.id, latest.current);
    gone.current = true;
    const snapshot = await deleteNote(note.id);
    reclaimMediaLater(snapshot.blocks.flatMap((b) => b.filePath ? [b.filePath] : []));
    setSheet(null);
    router.back();
    toast({ message: 'Note deleted', actionLabel: 'Undo', onAction: () => { void action(() => restoreNote(snapshot)); } });
  }); };
  const remind = (at: string | null) => { void action(async () => {
    if (at) await ensureReminderPermission();
    await setNoteReminder(note.id, at);
    setReminderAt(at);
    setSheet(null);
  }); };
  const removeBlock = (block: NoteBlock) => {
    const index = latest.current.blocks.findIndex((item) => item.id === block.id);
    if (focus.current?.blockId === block.id) focus.current = null;
    edit({ ...latest.current, blocks: latest.current.blocks.filter((item) => item.id !== block.id) });
    if (block.filePath) reclaimMediaLater([block.filePath]);
    toast({ message: 'Block deleted', actionLabel: 'Undo', onAction: () => {
      const restored = [...latest.current.blocks]; restored.splice(Math.min(index, restored.length), 0, block);
      edit({ ...latest.current, blocks: restored });
    } });
  };

  const palette = draft.color ? dataColors(theme, draft.color) : null;
  // Coloured notes take their colour's tint as the page, like Keep.
  const background = palette?.tint ?? theme.colors.background;
  const contentWidth = window.width - theme.spacing.xl * 2;
  const pill = { height: theme.sizes.circleButton, paddingHorizontal: theme.spacing.md, gap: theme.spacing.lg };

  return <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
    {/* Follows the keyboard frame directly: Android may neither resize the window nor report
        coordinates that KeyboardAvoidingView can use (Expo Go draws below the status bar). */}
    <Animated.View style={[{ flex: 1 }, keyboardPadding]}>
      <View style={[styles.row, { padding: theme.spacing.lg, gap: theme.spacing.sm }]}>
        <GlassButton accessibilityLabel="Save and go back" onPress={saveAndLeave}><Icon name="chevronLeft" size={theme.sizes.iconLarge} /></GlassButton>
        <GlassSurface contentStyle={[styles.row, pill]}>
          <HeaderIcon icon="undo" label="Undo" onPress={() => step(undo)} disabled={!steps.past.length} />
          <HeaderIcon icon="redo" label="Redo" onPress={() => step(redo)} disabled={!steps.future.length} />
        </GlassSurface>
        <View style={{ flex: 1 }} />
        <GlassSurface contentStyle={[styles.row, pill]}>
          <HeaderIcon icon="pin" label={draft.isPinned ? 'Unpin note' : 'Pin note'} selected={!!draft.isPinned}
            onPress={() => edit({ ...latest.current, isPinned: latest.current.isPinned ? 0 : 1 })} />
          <HeaderIcon icon="bell" label={reminderAt ? `Reminder, ${formatReminder(reminderAt)}` : 'Add reminder'} selected={!!reminderAt}
            onPress={() => { Keyboard.dismiss(); setSheet('reminder'); }} />
          <HeaderIcon icon="more" label="More options" onPress={() => { Keyboard.dismiss(); setSheet('options'); }} />
        </GlassSurface>
        <PressableScale haptic="success" accessibilityLabel="Done" disabled={busy} onPress={() => { Keyboard.dismiss(); saveAndLeave(); }}
          style={[styles.center, { width: theme.sizes.circleButton, height: theme.sizes.circleButton, borderRadius: theme.radii.pill, backgroundColor: theme.colors.accent }]}>
          <Icon name="check" color="onAccent" strokeWidth={2.8} />
        </PressableScale>
      </View>
      <DragScrollView revealCaret={revealCaret} keyboardShouldPersistTaps="handled" scrollEnabled={!manipulating && !drawingOn} contentContainerStyle={{ flexGrow: 1, padding: theme.spacing.xl, gap: theme.spacing.lg }}>
        <Text align="center" variant="footnote" color="secondaryLabel">{formatTimestamp(note.createdAt)}</Text>
        <TextField value={draft.title} onChangeText={(title) => edit({ ...latest.current, title }, 'title')} onFocus={() => { focus.current = null; setSelectedBlockId(null); setDrawingOn(false); }}
          appearance="bare" variant="largeTitle" bold placeholder="Heading" accessibilityLabel="Note heading" multiline />
        <NoteCanvas blocks={draft.blocks} width={contentWidth} selectedId={selectedBlockId} onSelect={setSelectedBlockId}
          ink={drawingOn ? { tool: inkTool, color: inkColor, onStroke: addStroke, onErase: eraseAtPoint } : null}
          onFrames={(next) => { frames.current = next; }} onManipulating={setManipulating} onDelete={removeBlock}
          onPlaceText={(layout) => addBlock(newBlock('TEXT'), true, layout)}
          onChangeLayout={(layouts) => edit({ ...latest.current, blocks: latest.current.blocks.map((block) =>
            layouts[block.id] ? { ...block, layout: serializeBlockLayout(layouts[block.id]) } : block) })}
          renderBlock={(block, imageStyle, wasHeld) => <View style={block.type === 'DRAWING' ? undefined : { backgroundColor: background }}>
            {block.type === 'TEXT' && <TextField appearance="bare" multiline placeholder={draft.blocks.length === 1 ? 'Write something…' : undefined} value={block.content ?? ''} accessibilityLabel="Note text"
              autoFocus={block.id === autoFocusId}
              onFocus={() => { setSelectedBlockId(block.id); const end = block.content?.length ?? 0; focus.current = { blockId: block.id, selection: { start: end, end } }; revealCaret.current?.(); }}
              onContentSizeChange={() => {
                // Typing a new last line must keep it above the keyboard too.
                const typing = focus.current?.blockId === block.id && focus.current.selection.end >= (block.content?.length ?? 0) - 1;
                if (typing) revealCaret.current?.(true);
              }}
              selection={cursor?.blockId === block.id ? { start: cursor.at, end: cursor.at } : undefined}
              onSelectionChange={(event) => {
                const { selection } = event.nativeEvent;
                focus.current = { blockId: block.id, selection };
                // Released once the cursor has arrived; the typing's own selection event may come first.
                if (cursor?.blockId === block.id && selection.start === cursor.at) setCursor(null);
              }}
              onChangeText={(text) => {
                const content = continueList(block.content ?? '', text);
                replaceBlock(block.id, { content }, `text:${block.id}`);
                setCursor(content !== text ? { blockId: block.id, at: listCursor(text, content) } : null);
              }} />}
            {block.type === 'IMAGE' && block.filePath && <Animated.View style={imageStyle}>
              <PressableScale accessibilityLabel="Open photo" accessibilityHint="Hold to move, or pinch to resize" style={{ flex: 1 }}
                onPress={() => { if (wasHeld()) return; haptics.tap(); setSelectedBlockId(null); setPhoto(mediaFile(block.filePath!).uri); }}>
                <Image source={{ uri: mediaFile(block.filePath).uri }} contentFit="contain" transition={150} accessibilityLabel="Attached photo"
                  style={{ width: '100%', height: '100%', borderRadius: theme.radii.card }} />
              </PressableScale>
            </Animated.View>}
            {block.type === 'VOICE' && block.filePath && <VoicePlayer uri={mediaFile(block.filePath).uri} durationMs={block.durationMs ?? 0} ignorePress={wasHeld} />}
            {block.type === 'CHECKLIST' && <ChecklistBlock blockId={block.id} content={block.content} autoFocus={block.id === autoFocusId}
              onFocus={() => { setSelectedBlockId(block.id); focus.current = { blockId: block.id, selection: { start: 0, end: 0 } }; revealCaret.current?.(); }}
              onChange={(content, group) => { if (content === '[]') removeBlock(block); else replaceBlock(block.id, { content }, group); }} />}
            {block.type === 'DRAWING' && <PressableScale accessibilityLabel="Draw on the page" accessibilityHint="Hold to move, or pinch to resize"
              onPress={() => { if (wasHeld()) return; haptics.tap(); startDrawing(); }}>
              <DrawingView drawing={parseDrawing(block.content)} />
            </PressableScale>}
          </View>} />
        {(reminderAt || draft.folder) && <View style={[styles.row, { flexWrap: 'wrap', gap: theme.spacing.sm }]}>
          {reminderAt && <NoteTag icon="bell" label={formatReminder(reminderAt)} past={Date.parse(reminderAt) <= openedAt} onPress={() => setSheet('reminder')} />}
          {draft.folder && <NoteTag icon="folder" label={draft.folder} onPress={() => setSheet('options')} />}
        </View>}
        <Text align="center" variant="caption1" color="tertiaryLabel">{`Edited ${formatRelativeTimestamp(editedAt)}`}</Text>
      </DragScrollView>
      {recording ? <VoiceRecorder onCancel={() => setRecording(false)} onError={(message) => toast({ message })} onSave={(uri, durationMs) => {
        void action(async () => { addBlock(newBlock('VOICE', '', importMedia(uri, 'm4a'), durationMs)); setRecording(false); });
      }} /> : <View>
        {drawingOn && <DrawingTools tool={inkTool} color={inkColor} onTool={setInkTool} onColor={(color) => { setInkColor(color); if (inkTool === 'eraser') setInkTool('pen'); }} />}
        <GlassSurface style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.sm }}
        contentStyle={[styles.row, { justifyContent: 'space-around', height: theme.sizes.toolbarHeight }]}>
        {(formatting ? FORMAT_TOOLS : INSERT_TOOLS).map((tool) => <PressableScale key={tool.id} haptic="selection" accessibilityLabel={tool.label} disabled={busy} hitSlop={theme.spacing.sm}
          accessibilityState={{ selected: tool.id === 'drawing' && drawingOn }}
          style={[styles.center, { minWidth: theme.sizes.circleButton, height: theme.sizes.circleButton, borderRadius: theme.radii.pill,
            backgroundColor: tool.id === 'drawing' && drawingOn ? theme.colors.accentFill : 'transparent' }]} onPress={() => runTool(tool.id)}>
          <Icon name={tool.icon} color={tool.id === 'drawing' && drawingOn ? 'accent' : 'label'} />
        </PressableScale>)}
      </GlassSurface></View>}
    </Animated.View>
    {sheet === 'options' && <NoteOptionsSheet {...sheetTransition} onClose={() => setSheet(null)} onDismissed={() => {
      sheetTransition.onDismissed();
      if (!shareAfterMenu.current) return;
      shareAfterMenu.current = false;
      openShare(noteShareContent({ theme, title: latest.current.title, blocks: latest.current.blocks }));
    }}
      options={{ color: draft.color, folder: draft.folder, folders, archived: !!note.isArchived, counts: noteCounts(draft.title, draft.blocks), createdAt: note.createdAt, updatedAt: editedAt }}
      onColor={(color) => edit({ ...latest.current, color })} onFolder={(folder) => edit({ ...latest.current, folder })}
      onShare={share} onCopy={copy} onArchive={archive} onDelete={remove} />}
    {sheet === 'reminder' && <ReminderSheet {...sheetTransition} reminderAt={reminderAt} onSet={remind} onClose={() => setSheet(null)} />}
    {photo && <PhotoViewer uri={photo} onClose={() => setPhoto(null)} />}
  </SafeAreaView>;
}

/** After list typing changed `typed` into `content`, the cursor goes after the added marker (or where the removed one was). */
function listCursor(typed: string, content: string) {
  let at = 0;
  while (at < typed.length && typed[at] === content[at]) at += 1;
  return at + Math.max(0, content.length - typed.length);
}

function HeaderIcon({ icon, label, onPress, disabled, selected }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; selected?: boolean }) {
  const theme = useTheme();
  return <PressableScale haptic="selection" hitSlop={theme.spacing.sm} accessibilityLabel={label} disabled={disabled}
    accessibilityState={{ disabled, selected }} onPress={onPress} style={{ opacity: disabled ? 0.35 : 1 }}>
    <Icon name={icon} color={selected ? 'accent' : 'label'} fill={selected ? theme.colors.accent : undefined} />
  </PressableScale>;
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
