import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { BottomSheet, type BottomSheetProps } from './sheet/BottomSheet';
import { SheetHeader, SheetIconButton } from './sheet/SheetHeader';

export type FormSheetTransition = Pick<BottomSheetProps, 'visible' | 'onDismissed'>;

/** Large sheet with a close button and scrolling content; `plain` matches the white Add Expense sheet. */
export function FormSheet({ title, onClose, children, visible = true, onDismissed, background = 'grouped', trailing, scroll = true }: {
  title: string; onClose: () => void; children: ReactNode; background?: BottomSheetProps['background'];
  /** Header action on the right, e.g. the Add Habit sheet's "Add" button. */
  trailing?: ReactNode;
  /** `false` lays children out in the fixed sheet height (keypad forms that must fit on screen). */
  scroll?: boolean;
} & Partial<FormSheetTransition>) {
  const theme = useTheme();
  const content = { padding: theme.spacing.lg, gap: theme.spacing.md };
  return <BottomSheet visible={visible} onClose={onClose} onDismissed={onDismissed} background={background}>
    <SheetHeader title={title} leading={<SheetIconButton icon="close" accessibilityLabel="Close" onPress={onClose} />} trailing={trailing} />
    {scroll
      ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.grow, content]}>{children}</ScrollView>
      : <View style={[styles.fill, content]}>{children}</View>}
  </BottomSheet>;
}

const styles = StyleSheet.create({ grow: { flexGrow: 1 }, fill: { flex: 1 } });
