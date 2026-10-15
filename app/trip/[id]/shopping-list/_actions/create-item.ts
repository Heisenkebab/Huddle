"use server";

import { createClient } from "@/lib/supabase/server";
import { ActionResult } from "@/types/action-result";
import { ShoppingListItemBody } from "@/types/shopping-list";

export type CreateItemResult = ActionResult<{ id: string }>;

export async function createItem(
  trip_id: string,
  item: ShoppingListItemBody,
): Promise<CreateItemResult> {
  try {
    const supabase = await createClient();

    // Trip lookup, item insert and history insert run in one transaction
    const { data, error } = await supabase.rpc("create_shopping_list_item", {
      p_trip_id: trip_id,
      p_name: item.name,
      p_category: item.category,
      p_unit: item.unit,
      p_amount: item.amount,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, data: { id: data as string } };
  } catch (error) {
    console.error("createItem failed:", error);
    return { success: false, error: "Failed to create item" };
  }
}
