import { useCallback, useState } from 'react';

/** Keep form content mounted through dismissal, and sequence replacements on iOS. */
export function useSheetState<T>(sequence = false) {
  const [state, setState] = useState<{ value: T | null; visible: boolean; pending: T | null }>({ value: null, visible: false, pending: null });
  const select = useCallback((value: T | null) => {
    setState((current) => {
      if (value === null) return { ...current, visible: false, pending: null };
      if (!sequence || current.value === null || current.value === value) return { value, visible: true, pending: null };
      return { ...current, visible: false, pending: value };
    });
  }, [sequence]);
  const onDismissed = useCallback(() => {
    setState((current) => current.visible ? current : { value: current.pending, visible: current.pending !== null, pending: null });
  }, []);
  return [state.value, select, { visible: state.visible, onDismissed }] as const;
}
