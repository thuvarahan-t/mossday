import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { todayLocalDate } from '@/lib/date';

/** Keep dashboards on the local day across midnight, sleep, and timezone changes. */
export function useToday() {
  const [today, setToday] = useState(todayLocalDate);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      const now = new Date();
      setToday(todayLocalDate(now));
      // Calendar arithmetic handles 23/25-hour days when the timezone uses DST.
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(update, midnight.getTime() - now.getTime());
    };
    update();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, []);
  return today;
}
