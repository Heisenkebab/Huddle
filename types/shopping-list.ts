export enum Unit {
  GRAM = "GRAM",
  KILOGRAM = "KILOGRAM",
  LITER = "LITER",
  MILLILITER = "MILLILITER",
  AMOUNT = "AMOUNT",
}

export interface ShoppingListItem {
  id: string;
  name: string;
  category: string;
  unit: Unit;
  quantity: number;
  bought_at: boolean;
}
