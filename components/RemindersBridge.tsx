import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
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

/** Tapping a reminder that carries a `url` (note reminders do) opens that screen. */
function openFromNotification(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url;
  if (response?.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER || typeof url !== 'string' || !url.startsWith('/note/')) return;
  router.push({ pathname: '/note/[id]', params: { id: url.slice('/note/'.length) } });
  void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
}

export function RemindersBridge() {
  const toast = useToast();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // A tap that launched the app arrives as the last response; later taps through the listener.
    void Notifications.getLastNotificationResponseAsync().then(openFromNotification, () => undefined);
    const subscription = Notifications.addNotificationResponseReceivedListener(openFromNotification);
    return () => subscription.remove();
  }, []);
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
