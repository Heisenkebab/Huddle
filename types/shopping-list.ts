export enum Unit {
  GRAM = "GRAM",
  KILOGRAM = "KILOGRAM",
  LITER = "LITER",
  MILLILITER = "MILLILITER",
  AMOUNT = "AMOUNT",
}

export interface ShoppingListItemCreationBody {
  name: string;
  category: string;
  unit: Unit;
  quantity: number;
}
