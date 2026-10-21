"use server";

import { createClient } from "@/lib/supabase/server";
import { ActionResult } from "@/types/action-result";

export type ChangeBoughtItemStateResult = ActionResult<undefined>;

export async function setShoppingListItemBought(
  trip_id: string,
  item_id: string,
  bought: boolean,
) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_shopping_list_item_bought", {
      p_trip_id: trip_id,
      p_item_id: item_id,
      p_bought: bought,
    });
    if (error) throw error;
    return { success: true, data: undefined };
  } catch (error) {
    console.error("changeItemBoughtState failed:", error);
    return { success: false, error: "Could not update bought state" };
  }
}
