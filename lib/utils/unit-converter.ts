import { Unit } from "@/types/shopping-list";

export type UnitGroup = "mass" | "volume" | "amount";

export interface BaseQuantityResult {
  baseQuantity: number;
  group: UnitGroup;
}

export function toBaseQuantity(
  quantity: number,
  unit: Unit,
): BaseQuantityResult {
  switch (unit) {
    case Unit.KILOGRAM:
      return { baseQuantity: quantity * 1000, group: "mass" };
    case Unit.GRAM:
      return { baseQuantity: quantity, group: "mass" };
    case Unit.LITER:
      return { baseQuantity: quantity * 1000, group: "volume" };
    case Unit.MILLILITER:
      return { baseQuantity: quantity, group: "volume" };
    case Unit.AMOUNT:
    default:
      return { baseQuantity: quantity, group: "amount" };
  }
}

export function fromBaseQuantity(
  baseQuantity: number,
  targetUnit: Unit,
): number {
  switch (targetUnit) {
    case Unit.KILOGRAM:
    case Unit.LITER:
      return baseQuantity / 1000;
    case Unit.GRAM:
    case Unit.MILLILITER:
    case Unit.AMOUNT:
    default:
      return baseQuantity;
  }
}
