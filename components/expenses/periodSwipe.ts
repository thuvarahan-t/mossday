/** Drag distance (pt) or flick speed (pt/s) that turns a horizontal swipe into a period change. */
export const PERIOD_SWIPE_DISTANCE = 64;
export const PERIOD_SWIPE_VELOCITY = 600;

/**
 * Page-turn direction: swiping left shows the next day / week / month and swiping right the
 * previous one. Short, slow drags change nothing. Returns the period offset.
 */
export function periodSwipeDelta(translationX: number, velocityX: number): -1 | 0 | 1 {
  'worklet';
  if (translationX < -PERIOD_SWIPE_DISTANCE || (translationX < 0 && velocityX < -PERIOD_SWIPE_VELOCITY)) return 1;
  if (translationX > PERIOD_SWIPE_DISTANCE || (translationX > 0 && velocityX > PERIOD_SWIPE_VELOCITY)) return -1;
  return 0;
}
