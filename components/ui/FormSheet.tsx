import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { BottomSheet, type BottomSheetProps } from './sheet/BottomSheet';
import { SheetHeader, SheetIconButton } from './sheet/SheetHeader';

export type FormSheetTransition = Pick<BottomSheetProps, 'visible' | 'onDismissed'>;

/** Room kept above a `fit` sheet's scroll area for the status bar, grabber and header. */
const FIT_CHROME = 120;

/**
 * Sheet with a close button and scrolling content. `large` fills most of the screen; `fit`
 * is only as tall as its content, so it grows when a field appears (Add Expense's note).
 */
export function FormSheet({ title, onClose, children, visible = true, onDismissed, background = 'grouped', trailing, size = 'large', dense, scrollEnabled = true }: {
  title: string; onClose: () => void; children: ReactNode; background?: BottomSheetProps['background'];
  /** Header action on the right, e.g. the Add Habit sheet's "Add" button. */
  trailing?: ReactNode;
  size?: 'large' | 'fit';
  /** Tighter spacing for dense forms on short screens. */
  dense?: boolean;
  /** Pause scrolling while a child owns a drag gesture. */
  scrollEnabled?: boolean;
} & Partial<FormSheetTransition>) {
  const theme = useTheme();
  const window = useWindowDimensions();
  const content = { padding: theme.spacing.lg, gap: dense ? theme.spacing.sm : theme.spacing.md };
  const fit = size === 'fit';
  return <BottomSheet visible={visible} onClose={onClose} onDismissed={onDismissed} background={background} detents={[fit ? 'content' : 'large']}>
    <SheetHeader title={title} leading={<SheetIconButton icon="close" accessibilityLabel="Close" onPress={onClose} />} trailing={trailing} />
    <ScrollView scrollEnabled={scrollEnabled} keyboardShouldPersistTaps="handled" style={fit && { flexGrow: 0, maxHeight: window.height - FIT_CHROME }}
      contentContainerStyle={[!fit && styles.grow, content]}>
      {children}
    </ScrollView>
  </BottomSheet>;
}

const styles = StyleSheet.create({ grow: { flexGrow: 1 } });
