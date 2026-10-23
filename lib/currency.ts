/** All supported currencies use the app's two-decimal amount input. No FX conversion. */
export const currencies = [
  { code: 'LKR', name: 'Sri Lankan rupee', symbol: 'Rs.' },
  { code: 'INR', name: 'Indian rupee', symbol: '\u20b9' },
  { code: 'USD', name: 'US dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '\u20ac' },
  { code: 'GBP', name: 'British pound', symbol: '\u00a3' },
  { code: 'AUD', name: 'Australian dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian dollar', symbol: 'C$' },
  { code: 'SGD', name: 'Singapore dollar', symbol: 'S$' },
  { code: 'AED', name: 'UAE dirham', symbol: 'AED' },
  { code: 'SAR', name: 'Saudi riyal', symbol: 'SAR' },
] as const;
export type CurrencyCode = typeof currencies[number]['code'];
export const isCurrencyCode = (value: unknown): value is CurrencyCode => currencies.some((currency) => currency.code === value);
let activeCurrency: CurrencyCode = 'LKR';
const listeners = new Set<() => void>();
export const getActiveCurrency = () => activeCurrency;
export function setActiveCurrency(code: CurrencyCode) {
  if (code === activeCurrency) return;
  activeCurrency = code;
  listeners.forEach((listener) => listener());
}
export function subscribeToCurrency(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export const currencySymbol = (code: CurrencyCode = activeCurrency) => currencies.find((currency) => currency.code === code)!.symbol;
