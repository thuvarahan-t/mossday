import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { BottomSheet, type BottomSheetProps } from './sheet/BottomSheet';
import { SheetHeader, SheetIconButton } from './sheet/SheetHeader';

export type FormSheetTransition = Pick<BottomSheetProps, 'visible' | 'onDismissed'>;

export function FormSheet({ title, onClose, children, visible = true, onDismissed }: {
  title: string; onClose: () => void; children: ReactNode;
} & Partial<FormSheetTransition>) {
  const theme = useTheme();
  return <BottomSheet visible={visible} onClose={onClose} onDismissed={onDismissed} background="grouped">
    <SheetHeader title={title} leading={<SheetIconButton icon="close" accessibilityLabel="Close" onPress={onClose} />} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
      {children}
    </ScrollView>
  </BottomSheet>;
}
