export enum Unit {
  GRAM = "GRAM",
  KILOGRAM = "KILOGRAM",
  MILLILITER = "MILLILITER",
  LITER = "LITER",
  AMOUNT = "AMOUNT",
}

export enum Category {
  FOOOD = "FOOOD",
  DRINK = "DRINK",
  DIARY = "DIARY",
  OTHER = "OTHER",
}

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

export interface ShoppingListHistory {
  trip_id: string;
  valid_from: string;
  shopping_list_item_id: string;
  bought_at: string | null;
  removed_at: string | null;
  unit: Unit;
  amount: number;
  shopping_list_item?: ShoppingListItem;
}
