export type ShoppingItem = {
  id: string;
  trip_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
  /** Wird im MVP später über das Detail-Popup gepflegt – aktuell nicht im UI. */
  description: string | null;
  purchased: boolean;
  added_by_name: string;
  added_by_color: string;
  created_at: string;
};

export type ShoppingItemInput = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
};

export const CATEGORIES = [
  "Obst & Gemüse",
  "Kühlregal",
  "Backwaren",
  "Getränke",
  "Grillen",
] as const;

/** Reihenfolge der Abschnitte in der Liste (wie im Laden). */
export const CATEGORY_ORDER = [
  "Obst & Gemüse",
  "Kühlregal",
  "Backwaren",
  "Grillen",
  "Getränke",
  "Sonstiges",
];

export const UNITS = ["Stück", "kg", "g", "l", "ml"] as const;

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
