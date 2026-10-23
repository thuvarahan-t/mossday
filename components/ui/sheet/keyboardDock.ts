/**
 * How far a docked sheet rises when the keyboard opens: until its content (above the
 * home-indicator padding) sits on the keyboard, but never so far that its top passes
 * `topLimit` (the status bar plus the large-sheet gap).
 */
export function dockedKeyboardLift({ screenHeight, keyboardTop, bottomInset, topLimit, sheetHeight }: {
  screenHeight: number; keyboardTop: number; bottomInset: number; topLimit: number; sheetHeight: number;
}): number {
  return Math.max(0, Math.min(screenHeight - keyboardTop - bottomInset, screenHeight - topLimit - sheetHeight));
}
