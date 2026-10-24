import type { IconName } from '@/components/ui/Icon';

/**
 * The tab bar's order, left to right. Today sits in the middle, within thumb reach from
 * either side. Tab swipes move between neighbours in this same order.
 */
export const tabs = [
  { name: 'habits', href: '/habits', title: 'Habits', icon: 'habits' },
  { name: 'expenses', href: '/expenses', title: 'Expenses', icon: 'wallet' },
  { name: 'index', href: '/', title: 'Today', icon: 'home' },
  { name: 'diary', href: '/diary', title: 'Diary', icon: 'calendar' },
  { name: 'notes', href: '/notes', title: 'Notes', icon: 'note' },
] as const satisfies readonly { name: string; href: string; title: string; icon: IconName }[];

export type TabName = typeof tabs[number]['name'];
