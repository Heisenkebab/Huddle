"use server";

import { createClient } from "@/lib/supabase/server";
import { ActionResult } from "@/types/action-result";
import { ShoppingListActiveItem } from "@/types/shopping-list";

export type GetActiveItemsResult = ActionResult<ShoppingListActiveItem[]>;

export async function getAllActiveShoppingListItems(
  tripId: string,
): Promise<GetActiveItemsResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc(
      "get_all_active_shopping_list_items",
      {
        p_trip_id: tripId,
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, data: data };
  } catch (error) {
    console.error("getAllActiveShoppingListItems failed:", error);
    return {
      success: false,
      error: "Failed to fetch active shopping list items",
    };
  }
}
