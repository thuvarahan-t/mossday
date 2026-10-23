import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { subscribeToStore } from '@/lib/repos/store';
import { useToast } from '@/components/ui/Toast';

/** Refresh on focus, local writes, and returning from background; ignore stale requests. */
export function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const refresh = useCallback(() => {
    const request = ++generation.current;
    void load().then((value) => {
      if (request === generation.current) { setData(value); setError(null); }
    }, (failure: unknown) => {
      if (request === generation.current) setError(failure instanceof Error ? failure.message : 'Could not load your data.');
    });
  }, [load]);
  useFocusEffect(useCallback(() => {
    refresh();
    const unsubscribe = subscribeToStore(refresh);
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { generation.current += 1; unsubscribe(); appState.remove(); };
  }, [refresh]));
  return { data, error, refresh };
}

export function useAction() {
  const toast = useToast();
  return useCallback(async (operation: () => Promise<unknown>, onSuccess?: () => void) => {
    try { await operation(); onSuccess?.(); return true; }
    catch (error) { toast({ message: error instanceof Error ? error.message : 'Something went wrong. Please try again.' }); return false; }
  }, [toast]);
}

/** Flush pending text edits when leaving a screen, including via a back gesture. */
export function useAutosave<T>(save: (value: T) => Promise<unknown>) {
  const action = useAction();
  const latestSave = useRef(save);
  latestSave.current = save;
  const pending = useRef<{ value: T; timer: ReturnType<typeof setTimeout> } | null>(null);
  const flush = useCallback(() => {
    const edit = pending.current;
    if (!edit) return;
    clearTimeout(edit.timer);
    pending.current = null;
    void action(() => latestSave.current(edit.value));
  }, [action]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') flush(); });
    return () => { subscription.remove(); flush(); };
  }, [flush]);
  return useCallback((value: T) => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = { value, timer: setTimeout(flush, 600) };
  }, [flush]);
}
