export const CATEGORIES = [
  "produce",
  "chilled",
  "bakery",
  "drinks",
  "bbq",
  "other",
] as const;
export type CategoryKey = (typeof CATEGORIES)[number];

/** Reihenfolge der Abschnitte in der Liste (wie im Laden). */
export const CATEGORY_ORDER: CategoryKey[] = [
  "produce",
  "chilled",
  "bakery",
  "bbq",
  "drinks",
  "other",
];

export const UNITS = ["pcs", "kg", "g", "l", "ml"] as const;
export type UnitKey = (typeof UNITS)[number];

export type ShoppingItem = {
  id: string;
  trip_id: string;
  name: string;
  quantity: number;
  unit: UnitKey;
  category: CategoryKey;
  /** Wird im MVP später über das Detail-Popup gepflegt – aktuell nicht im UI. */
  description: string | null;
  purchased: boolean;
  added_by_name: string;
  added_by_color: string;
  created_at: string;
};

export type ShoppingItemInput = {
  name: string;
  quantity: number;
  unit: UnitKey;
  category: CategoryKey;
};

export type Trip = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

export type Person = {
  key: string;
  name: string;
  color: string;
  online: boolean;
  isMe: boolean;
};
