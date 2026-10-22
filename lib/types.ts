export const CATEGORIES = [
  "produce",
  "chilled",
  "bakery",
  "drinks",
  "bbq",
  "other",
] as const;
export type CategoryKey = (typeof CATEGORIES)[number];

/** Order of the sections in the list (like in the store). */
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

/** An item as the list shows it (from ShoppingListActiveItem, see lib/shopping-list.ts). */
export type ShoppingItem = {
  id: string;
  name: string;
  quantity: number;
  unit: UnitKey;
  category: CategoryKey;
  purchased: boolean;
  /** When it was ticked off; orders the "Bought" section */
  bought_at: string | null;
  /** null when the profile is gone or the row was written by the service role */
  added_by_name: string | null;
  added_by_color: string | null;
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

export type Profile = {
  id: string;
  name: string;
  color: string;
};

export type Person = {
  key: string;
  name: string;
  color: string;
  isMe: boolean;
};
