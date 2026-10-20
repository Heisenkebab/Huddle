"use server";
import { createClient } from "@/lib/supabase/server";
import { ActionResult } from "@/types/action-result";

export type RemoveShoppingListItemResult = ActionResult<undefined>;

export default async function removeShoppingListItem(
  tripId: string,
  itemId: string,
) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("remove_shopping_list_item", {
      p_item_id: itemId,
      p_trip_id: tripId,
    });
    if (error) {
      throw new Error(error.message);
    }
    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: "Failed to remove shopping list item" };
  }
}
