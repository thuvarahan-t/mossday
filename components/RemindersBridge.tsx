import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { syncReminders } from '@/lib/reminders';
import { subscribeToStore } from '@/lib/repos/store';
import { useToast } from './ui/Toast';

if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Ignore handler failures in environments where native notifications are unsupported
  }
}

export function RemindersBridge() {
  const toast = useToast();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let timer: ReturnType<typeof setTimeout>;
    let queued: Promise<unknown> = Promise.resolve();
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        queued = queued.then(syncReminders).catch(() => toast({ message: 'Reminders could not sync. Reopen Settings and check notification access.' }));
      }, 300);
    };
    update();
    const unsubscribe = subscribeToStore((topic) => { if (topic === 'reminders') update(); });
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') update(); });
    return () => { clearTimeout(timer); unsubscribe(); appState.remove(); };
  }, [toast]);
  return null;
}
