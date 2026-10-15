const numberFormat = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 3,
  useGrouping: false,
});

/** 1.5 → "1,5" */
export function formatNumber(n: number): string {
  return numberFormat.format(n);
}

/** "1,5" oder "1.5" → 1.5; ungültig → null */
export function parseNumber(text: string): number | null {
  const cleaned = text.trim().replace(",", ".");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

/** 2 + "l" → "2 l" */
export function formatQuantity(
  quantity: number | null,
  unit: string | null,
): string {
  if (quantity == null) return unit ?? "";
  return unit ? `${formatNumber(quantity)} ${unit}` : formatNumber(quantity);
}

/** → "Fr, 12. Juni, 14:20" */
export function formatAddedAt(iso: string): string {
  const d = new Date(iso);
  const weekday = d
    .toLocaleDateString("de-DE", { weekday: "short" })
    .replace(".", "");
  const month = d.toLocaleDateString("de-DE", { month: "long" });
  const time = d.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${weekday}, ${d.getDate()}. ${month}, ${time}`;
}

/** Schrittweite für die +/- Buttons je nach Einheit. */
export function stepForUnit(unit: string | null): number {
  switch (unit) {
    case "g":
    case "ml":
      return 100;
    case "kg":
    case "l":
      return 0.5;
    default:
      return 1;
  }
}

/** "2026-06-12", "2026-06-14" → "12.–14. Juni" */
export function formatTripDates(
  start: string | null,
  end: string | null,
): string {
  if (!start) return "";
  const s = new Date(`${start}T00:00:00`);
  const month = (d: Date) => d.toLocaleDateString("de-DE", { month: "long" });
  if (!end || end === start) return `${s.getDate()}. ${month(s)}`;
  const e = new Date(`${end}T00:00:00`);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}.–${e.getDate()}. ${month(e)}`;
  }
  return `${s.getDate()}. ${month(s)} – ${e.getDate()}. ${month(e)}`;
}
