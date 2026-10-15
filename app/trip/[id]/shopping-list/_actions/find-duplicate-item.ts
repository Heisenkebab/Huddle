"use server";

import { ActionResult } from "@/types/action-result";
import {
  ShoppingListItemBody,
  ShoppingListHistory,
} from "@/types/shopping-list";
import { toBaseQuantity, fromBaseQuantity } from "@/lib/utils/unit-converter";
import { getAllActiveShoppingListItems } from "./get-all-active-items";

export type DuplicateCheckData = {
  isDuplicate: boolean;
  message: string;
  existingHistoryRecord?: ShoppingListHistory;
  updatedAmount?: number;
};

export type CheckDuplicateResult = ActionResult<DuplicateCheckData>;

export async function findDuplicateShoppingListItem(
  inviteId: string,
  newItemData: ShoppingListItemBody,
): Promise<CheckDuplicateResult> {
  try {
    const activeItemsResult = await getAllActiveShoppingListItems(inviteId);

    if (!activeItemsResult.success) {
      return { success: false, error: activeItemsResult.error };
    }

    const activeItems = activeItemsResult.data;
    const normalizedNewName = newItemData.name.trim().toLowerCase();

    const existingRecord = activeItems.find(
      (record) =>
        record.shopping_list_item?.name.trim().toLowerCase() ===
        normalizedNewName,
    );

    if (existingRecord) {
      const existingBase = toBaseQuantity(
        existingRecord.amount,
        existingRecord.unit,
      );
      const newBase = toBaseQuantity(newItemData.amount, newItemData.unit);

      if (existingBase.group === newBase.group) {
        const combinedBaseQuantity =
          existingBase.baseQuantity + newBase.baseQuantity;
        const updatedAmount = fromBaseQuantity(
          combinedBaseQuantity,
          existingRecord.unit,
        );

        return {
          success: true,
          data: {
            isDuplicate: true,
            message: `Item already exists. Quantity will be updated from ${existingRecord.amount} ${existingRecord.unit} to ${updatedAmount} ${existingRecord.unit}.`,
            existingHistoryRecord: existingRecord,
            updatedAmount,
          },
        };
      }
    }

    return {
      success: true,
      data: {
        isDuplicate: false,
        message: "Item does not exist yet.",
      },
    };
  } catch (error) {
    console.error("findDuplicateShoppingListItem failed:", error);
    return { success: false, error: "Failed to check for duplicate item" };
  }
}
