import { useSyncExternalStore } from 'react';
import { getActiveCurrency, subscribeToCurrency } from '@/lib/currency';

/** The active currency code; screens that format money call it to re-render when it changes. */
export function useCurrency() {
  return useSyncExternalStore(subscribeToCurrency, getActiveCurrency, () => 'LKR' as const);
}
