import { Constants, Database } from "./database.types";

export type Unit = Database["public"]["Enums"]["Unit"];
export const Unit = Object.fromEntries(
  Constants.public.Enums.Unit.map((u) => [u, u]),
) as { [K in Unit]: K };

export type Category = Database["public"]["Enums"]["Category"];
export const Category = Object.fromEntries(
  Constants.public.Enums.Category.map((c) => [c, c]),
) as { [K in Category]: K };

export interface ShoppingListItemBody {
  name: string;
  category: Category;
  unit: Unit;
  amount: number;
}

export interface ShoppingListItem {
  id: string;
  category: Category;
  name: string;
}

// An open history entry together with its item, as returned by createItem
export interface ShoppingListEntry {
  id: string;
  shopping_list_item_id: string;
  unit: Unit;
  amount: number;
  shopping_list_item: ShoppingListItem;
}

// What createItem returns: the open entry, and whether the new amount was
// merged into an entry that was already on the list
export interface CreatedShoppingListEntry extends ShoppingListEntry {
  merged: boolean;
}

export interface ShoppingListActiveItem {
  id: string;
  trip_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  bought_at: string | null;
  category: Category;
  name: string;
  unit: Unit;
  amount: number;
}
