"use server";

import { createClient } from "@/lib/supabase/server";
import { ActionResult } from "@/types/action-result";
import {
  Category,
  ShoppingListEntry,
  ShoppingListItemBody,
  Unit,
} from "@/types/shopping-list";

export type UpdateItemResult = ActionResult<ShoppingListEntry>;

export async function updateItem(
  item_id: string,
  trip_id: string,
  updateBody: Partial<ShoppingListItemBody>,
): Promise<UpdateItemResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .rpc("update_shopping_list_item", {
        p_item_id: item_id,
        p_name: updateBody.name,
        p_category: updateBody.category,
        p_unit: updateBody.unit,
        p_amount: updateBody.amount,
        p_trip_id: trip_id,
      })
      .single();
    if (error) {
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
      },
    };
  } catch (error) {
    console.error("updateItem failed:", error);
    return { success: false, error: "Failed to update item" };
  }
}
