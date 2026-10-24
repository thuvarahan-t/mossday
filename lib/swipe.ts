/** Drag distance (pt) or flick speed (pt/s) that turns a horizontal swipe into a step. */
export const SWIPE_DISTANCE = 64;
export const SWIPE_VELOCITY = 600;

/**
 * Page-turn direction, used for every horizontal step in the app (Expenses sections, tabs):
 * swiping left moves to the next item (1) and swiping right to the previous one (-1).
 * Short, slow drags, and flicks against the drag, change nothing (0).
 */
export function swipeDelta(translationX: number, velocityX: number): -1 | 0 | 1 {
  'worklet';
  if (translationX < -SWIPE_DISTANCE || (translationX < 0 && velocityX < -SWIPE_VELOCITY)) return 1;
  if (translationX > SWIPE_DISTANCE || (translationX > 0 && velocityX > SWIPE_VELOCITY)) return -1;
  return 0;
}
