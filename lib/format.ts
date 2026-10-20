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

/** "1,5" oder "1.5" → 1.5; ungültig → null */
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
 * Erlaubte Nachkommastellen je Einheit, wie is_valid_amount in der DB:
 * kg/l höchstens drei (1,234 kg = 1234 g), g/ml/Stück nur ganze Zahlen.
 */
export function maxDecimalsForUnit(unit: string | null): number {
  return unit === "kg" || unit === "l" ? 3 : 0;
}

/** Größer 0 und nicht mehr Nachkommastellen, als die Einheit erlaubt. */
export function isValidQuantity(
  quantity: number | null,
  unit: string | null,
): boolean {
  if (quantity === null || quantity <= 0) return false;
  return Number(quantity.toFixed(maxDecimalsForUnit(unit))) === quantity;
}

/**
 * Darf das Mengenfeld diesen (evtl. halb getippten) Text enthalten?
 * Bei g/ml/Stück kein Komma, bei kg/l höchstens drei Nachkommastellen.
 */
export function isQuantityInput(text: string, unit: string | null): boolean {
  const decimals = maxDecimalsForUnit(unit);
  if (decimals === 0) return /^\d*$/.test(text);
  return new RegExp(`^\\d*([.,]\\d{0,${decimals}})?$`).test(text);
}

/**
 * Menge nach einem Einheitenwechsel: auf g/ml → 100, von g/ml weg → 1,
 * zwischen kg/l bleibt die Menge, auf Stück wird gerundet (1,5 kg → 2 Stück).
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

/** Schrittweite für die +/- Buttons je nach Einheit. */
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
  if (!end || end === start) return format.format(s);
  return format.formatRange(s, new Date(`${end}T00:00:00`));
}
