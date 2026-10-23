const rupeeFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0, maximumFractionDigits: 2,
});

/** Money is stored as integer cents; retain nonzero cents when displaying it. */
export function formatMoney(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new RangeError('Money must be a safe integer in cents.');
  return `Rs. ${rupeeFormatter.format(cents / 100)}`;
}

/** The number without the currency prefix, e.g. "1,250" (amount display, widget). */
export function formatAmount(cents: number): string {
  return formatMoney(cents).replace(/^Rs\. /, '');
}

export const MAX_WHOLE_DIGITS = 7;

/**
 * Parses keypad input ("450", "12.5") into cents. Returns null for empty or invalid
 * input, so the Save button can stay disabled.
 */
export function parseAmountInput(input: string): number | null {
  if (!/^\d+(\.\d{0,2})?$/.test(input)) return null;
  const [whole, fraction = ''] = input.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/** Keypad input for an existing amount: 45000 → "450", 12550 → "125.5". */
export function amountToInput(cents: number): string {
  return String(cents / 100);
}

/** Applies one keypad key to the current input, enforcing the 7-digit / 2-decimal limits. */
export function applyKeypadKey(input: string, key: string): string {
  if (key === 'backspace') return input.slice(0, -1);
  if (key === '.') {
    if (input.includes('.')) return input;
    return input === '' ? '0.' : `${input}.`;
  }
  if (!/^\d$/.test(key)) return input;
  const [whole, fraction] = input.split('.');
  if (fraction !== undefined) return fraction.length >= 2 ? input : input + key;
  if (whole === '0') return key;
  return whole.length >= MAX_WHOLE_DIGITS ? input : input + key;
}
