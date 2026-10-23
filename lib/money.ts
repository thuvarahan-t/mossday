const rupeeFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0, maximumFractionDigits: 2,
});

/** Money is stored as integer cents; retain nonzero cents when displaying it. */
export function formatMoney(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new RangeError('Money must be a safe integer in cents.');
  return `Rs. ${rupeeFormatter.format(cents / 100)}`;
}
