/** A deliberate swipe, about two fifths of a phone's width, turns a page. */
export const SWIPE_DISTANCE = 140;

/**
 * Page-turn direction, used for every horizontal step in the app (Expenses sections, tabs):
 * swiping left moves to the next item (1) and swiping right to the previous one (-1).
 * Short drags never change pages, even when released with a fast flick.
 */
export function swipeDelta(translationX: number, _velocityX: number, width?: number): -1 | 0 | 1 {
  'worklet';
  const threshold = width ? Math.max(120, Math.min(180, width * 0.38)) : SWIPE_DISTANCE;
  if (translationX <= -threshold) return 1;
  if (translationX >= threshold) return -1;
  return 0;
}
