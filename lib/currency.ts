const COUNTRY_CURRENCY_CODES: Record<string, string> = {
  DE: 'EUR',
  GH: 'GHS',
  IN: 'INR',
  GB: 'GBP',
  US: 'USD',
};

const COUNTRY_NAME_CURRENCY_CODES: Record<string, string> = {
  germany: 'EUR',
  deutschland: 'EUR',
  ghana: 'GHS',
  india: 'INR',
  'united kingdom': 'GBP',
  uk: 'GBP',
  'great britain': 'GBP',
  'united states': 'USD',
  'united states of america': 'USD',
  usa: 'USD',
};

export function currencyForCountry(countryCode?: string | null, country?: string | null): string {
  const code = String(countryCode || '').trim().toUpperCase();
  if (COUNTRY_CURRENCY_CODES[code]) return COUNTRY_CURRENCY_CODES[code];
  const name = String(country || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return COUNTRY_NAME_CURRENCY_CODES[name] || 'EUR';
}

export function formatCurrencyAmount(amount: number | string, currency: string, locale?: string | null): string {
  const parsed = typeof amount === 'number' ? amount : Number(String(amount).replace(',', '.'));
  if (!Number.isFinite(parsed)) return '';
  try {
    return new Intl.NumberFormat(locale || 'en', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: Number.isInteger(parsed) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(parsed);
  } catch {
    return `${currency} ${parsed}`;
  }
}

export function parseLegacyBudget(value: unknown): { amount: string; currency: string } | null {
  const text = String(value || '').trim();
  const amountMatch = text.match(/\d+(?:[.,]\d+)?/);
  if (!amountMatch) return null;
  const upper = text.toUpperCase();
  const currency = upper.includes('GH₵') || upper.includes('GHS')
    ? 'GHS'
    : upper.includes('£') || upper.includes('GBP')
      ? 'GBP'
      : upper.includes('$') || upper.includes('USD')
        ? 'USD'
        : upper.includes('₹') || upper.includes('INR')
          ? 'INR'
          : 'EUR';
  return { amount: amountMatch[0].replace(',', '.'), currency };
}

export function parseBudgetEntry(value: unknown): { amount: string; currency: string } | null {
  const text = String(value || '').trim();
  const amountMatch = text.match(/\d+(?:[.,]\d+)?/);
  if (!amountMatch) return null;

  const upper = text.toUpperCase();
  const codeMatch = upper.match(/(?:^|\s)([A-Z]{3})(?:\s|$)/);
  const currency = upper.includes('GH₵')
    ? 'GHS'
    : upper.includes('€')
      ? 'EUR'
      : upper.includes('£')
        ? 'GBP'
        : upper.includes('$')
          ? 'USD'
          : upper.includes('₹')
            ? 'INR'
            : codeMatch?.[1];

  return currency ? { amount: amountMatch[0].replace(',', '.'), currency } : null;
}
