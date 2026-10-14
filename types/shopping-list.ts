export enum Unit {
  GRAM = "GRAM",
  KILOGRAM = "KILOGRAM",
  LITER = "LITER",
  MILLILITER = "MILLILITER",
  AMOUNT = "AMOUNT",
}

export interface ShoppingListItem {
  name: string;
  category: string;
  unit: Unit;
  quantity: number;
}
