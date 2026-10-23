import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { BottomSheet, type BottomSheetProps } from './sheet/BottomSheet';
import { SheetHeader, SheetIconButton } from './sheet/SheetHeader';

export type FormSheetTransition = Pick<BottomSheetProps, 'visible' | 'onDismissed'>;

/** Large sheet with a close button and scrolling content; `plain` matches the white Add Expense sheet. */
export function FormSheet({ title, onClose, children, visible = true, onDismissed, background = 'grouped', trailing }: {
  title: string; onClose: () => void; children: ReactNode; background?: BottomSheetProps['background'];
  /** Header action on the right, e.g. the Add Habit sheet's "Add" button. */
  trailing?: ReactNode;
} & Partial<FormSheetTransition>) {
  const theme = useTheme();
  return <BottomSheet visible={visible} onClose={onClose} onDismissed={onDismissed} background={background}>
    <SheetHeader title={title} leading={<SheetIconButton icon="close" accessibilityLabel="Close" onPress={onClose} />} trailing={trailing} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: theme.spacing.lg, gap: theme.spacing.lg }}>
      {children}
    </ScrollView>
  </BottomSheet>;
}
