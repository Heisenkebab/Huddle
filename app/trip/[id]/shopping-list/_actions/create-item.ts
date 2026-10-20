"use server";

import { createClient } from "@/lib/supabase/server";
import { ActionResult } from "@/types/action-result";
import {
  Category,
  CreatedShoppingListEntry,
  ShoppingListItemBody,
  Unit,
} from "@/types/shopping-list";

export type CreateItemResult = ActionResult<CreatedShoppingListEntry>;

export async function createItem(
  trip_id: string,
  item: ShoppingListItemBody,
): Promise<CreateItemResult> {
  try {
    const supabase = await createClient();

    // Trip lookup, item insert and history insert/merge run in one transaction
    const { data, error } = await supabase
      .rpc("create_shopping_list_item", {
        p_trip_id: trip_id,
        p_name: item.name,
        p_category: item.category,
        p_unit: item.unit,
        p_amount: item.amount,
      })
      .single();

    if (error) {
      if (error.hint === "unit_mismatch") {
        return {
          success: false,
          error: "Item is already on the list in a different unit",
        };
      }
      if (error.hint === "invalid_amount") {
        return { success: false, error: "Invalid amount for this unit" };
      }
      throw new Error(error.message);
    }

    return {
      success: true,
      data: {
        id: data.id,
        shopping_list_item_id: data.shopping_list_item_id,
        unit: data.unit as Unit,
        amount: Number(data.amount),
        shopping_list_item: {
          id: data.shopping_list_item_id,
          category: data.category as Category,
          name: data.name,
        },
        merged: data.merged,
      },
    };
  } catch (error) {
    console.error("createItem failed:", error);
    return { success: false, error: "Failed to create item" };
  }
}
