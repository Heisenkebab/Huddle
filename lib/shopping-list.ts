import type { CategoryKey, ShoppingItem, UnitKey } from "@/lib/types";
import type {
  Category,
  ShoppingListActiveItem,
  Unit,
} from "@/types/shopping-list";

// The UI (translations, format.ts) uses short lowercase keys, the database
// its enum values; these maps translate between the two
const UNIT_FROM_DB: Record<Unit, UnitKey> = {
  AMOUNT: "pcs",
  KILOGRAM: "kg",
  GRAM: "g",
  LITER: "l",
  MILLILITER: "ml",
};

const UNIT_TO_DB = Object.fromEntries(
  Object.entries(UNIT_FROM_DB).map(([db, ui]) => [ui, db]),
) as Record<UnitKey, Unit>;

const CATEGORY_FROM_DB: Record<Category, CategoryKey> = {
  PRODUCE: "produce",
  CHILLED: "chilled",
  BAKERY: "bakery",
  DRINKS: "drinks",
  BBQ: "bbq",
  OTHER: "other",
};

const CATEGORY_TO_DB = Object.fromEntries(
  Object.entries(CATEGORY_FROM_DB).map(([db, ui]) => [ui, db]),
) as Record<CategoryKey, Category>;

export const unitToDb = (unit: UnitKey) => UNIT_TO_DB[unit];
export const categoryToDb = (category: CategoryKey) => CATEGORY_TO_DB[category];

export function toShoppingItem(row: ShoppingListActiveItem): ShoppingItem {
  return {
    id: row.id,
    name: row.name,
    quantity: Number(row.amount),
    unit: UNIT_FROM_DB[row.unit],
    category: CATEGORY_FROM_DB[row.category],
    purchased: row.bought_at !== null,
    bought_at: row.bought_at,
    added_by_name: row.created_by_name,
    added_by_color: row.created_by_color,
    created_at: row.created_at,
  };
}

const UNKNOWN_AUTHOR_COLOR = "#999";

/** Profile deleted or row written by the service role → show as guest */
export function authorOf(item: ShoppingItem, guestName: string) {
  return {
    name: item.added_by_name ?? guestName,
    color: item.added_by_color ?? UNKNOWN_AUTHOR_COLOR,
  };
}

/** Same limit in the editor, the server actions and the DB */
export const ITEM_NAME_MAX_LENGTH = 80;

/** The RPCs trim the name, so the limit applies trimmed */
export function isValidItemName(name: unknown): name is string {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  return trimmed.length > 0 && trimmed.length <= ITEM_NAME_MAX_LENGTH;
}
