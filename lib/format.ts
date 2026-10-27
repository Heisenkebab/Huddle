export function formatNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 3,
    useGrouping: false,
  }).format(n);
}

export function decimalSeparator(locale: string): string {
  return (
    new Intl.NumberFormat(locale)
      .formatToParts(1.5)
      .find((p) => p.type === "decimal")?.value ?? "."
  );
}

/** "1,5" or "1.5" → 1.5; invalid → null */
export function parseNumber(text: string): number | null {
  const cleaned = text.trim().replace(",", ".");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function formatQuantity(
  quantity: number | null,
  unit: string | null,
  locale: string,
): string {
  if (quantity == null) return unit ?? "";
  const n = formatNumber(quantity, locale);
  return unit ? `${n} ${unit}` : n;
}

export function formatAddedAt(iso: string, locale: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
  const time = d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

const isSmallUnit = (unit: string | null) => unit === "g" || unit === "ml";

/**
 * Allowed decimal places per unit, matching is_valid_amount in the DB:
 * kg/l at most three (1.234 kg = 1234 g), g/ml/pieces whole numbers only.
 */
export function maxDecimalsForUnit(unit: string | null): number {
  return unit === "kg" || unit === "l" ? 3 : 0;
}

/** Maximum quantity in any unit, matching is_valid_amount in the DB. */
export const MAX_QUANTITY = 10000;

/** Greater than 0, at most MAX_QUANTITY, decimal places depending on unit. */
export function isValidQuantity(
  quantity: number | null,
  unit: string | null,
): boolean {
  if (quantity === null || quantity <= 0 || quantity > MAX_QUANTITY)
    return false;
  return Number(quantity.toFixed(maxDecimalsForUnit(unit))) === quantity;
}

/**
 * May the quantity field contain this (possibly half-typed) text?
 * No decimal separator for g/ml/pieces, at most three decimals for kg/l.
 */
export function isQuantityInput(text: string, unit: string | null): boolean {
  const decimals = maxDecimalsForUnit(unit);
  if (decimals === 0) return /^\d*$/.test(text);
  return new RegExp(`^\\d*([.,]\\d{0,${decimals}})?$`).test(text);
}

/**
 * Quantity after a unit change: to g/ml → 100, away from g/ml → 1,
 * between kg/l the quantity stays, to pieces it is rounded (1.5 kg → 2 pieces).
 */
export function quantityAfterUnitChange(
  quantity: number | null,
  from: string | null,
  to: string | null,
): number | null {
  if (isSmallUnit(to)) return 100;
  if (isSmallUnit(from)) return 1;
  if (quantity !== null && maxDecimalsForUnit(to) === 0)
    return Math.max(1, Math.round(quantity));
  return quantity;
}

/** Step size for the +/- buttons depending on unit. */
export function stepForUnit(unit: string | null): number {
  switch (unit) {
    case "g":
    case "ml":
      return 100;
    default:
      return 1;
  }
}

export function formatTripDates(
  start: string | null,
  end: string | null,
  locale: string,
): string {
  if (!start) return "";
  const format = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
  });
  const s = new Date(`${start}T00:00:00`);
  const text =
    !end || end === start
      ? format.format(s)
      : format.formatRange(s, new Date(`${end}T00:00:00`));
  return normalizeSpaces(text);
}

// Node and browsers ship different ICU versions, which put different special
// spaces (thin, narrow no-break) around the "–" of a range. Plain spaces keep
// the server-rendered text identical to the client's and avoid hydration errors.
function normalizeSpaces(text: string): string {
  return text.replace(/[   ]/g, " ");
}
