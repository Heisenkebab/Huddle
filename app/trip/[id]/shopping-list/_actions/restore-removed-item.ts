"use server";
import { createClient } from "@/lib/supabase/server";
import { ActionResult } from "@/types/action-result";

export type RestoreShoppingListItemResult = ActionResult<undefined>;

export default async function restoreRemovedShoppingListItem(
  tripId: string,
  itemId: string,
): Promise<RestoreShoppingListItemResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("restore_removed_shopping_list_item", {
      p_trip_id: tripId,
      p_item_id: itemId,
    });
    if (error) {
      throw new Error(error.message);
    }
    return { success: true, data: undefined };
  } catch (error) {
    console.error("restoreShoppingListItem failed: " + error);
    return { success: false, error: "Failed to restore shopping list item" };
  }
}
