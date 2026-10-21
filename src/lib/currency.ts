/** Approximate units per 1 EUR. Fixed values for estimates only; not live exchange rates. */
export const RATES_PER_EUR: Record<string, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.85,
  CHF: 0.95,
  PLN: 4.31,
  CZK: 25.2,
  JPY: 165.5,
  IDR: 17200,
  BRL: 5.85,
  MAD: 10.8,
};

export const CURRENCIES = Object.keys(RATES_PER_EUR);

export function toEUR(amount: number, currency: string): number {
  return amount / (RATES_PER_EUR[currency] ?? 1);
}

export function convert(amount: number, from: string, to: string): number {
  return toEUR(amount, from) * (RATES_PER_EUR[to] ?? 1);
}

export const formatMoney = (amount: number, currency = "EUR") =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency, maximumFractionDigits: 2 }).format(
    amount,
  );
