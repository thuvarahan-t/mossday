import { isIconName, type IconName } from '@/components/ui/Icon';
import type { AccentName } from '@/constants/colors';

export type CategoryStyle = { icon: IconName; color: AccentName | string };

/** One-time expenses have no category row; the design draws them with a purple tag. */
export const oneTimeStyle: CategoryStyle = { icon: 'tag', color: 'purple' };

/** Icon tile for a category stored in the DB, tolerating unknown icon names from older data. */
export function categoryStyle(icon: string | null | undefined, color: string | null | undefined): CategoryStyle {
  if (!icon || !color) return oneTimeStyle;
  return { icon: isIconName(icon) ? icon : 'tag', color };
}

