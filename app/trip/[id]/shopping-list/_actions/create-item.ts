"use server";

import { createClient } from "@/lib/supabase/server";
import { ShoppingListItemCreationBody } from "@/types/shopping-list";

export async function createItem(
  invite_id: string,
  item: ShoppingListItemCreationBody,
): Promise<boolean> {
  try {
    const supabase = await createClient();
    // Trip lookup, item insert and history insert run in one transaction
    const { error } = await supabase.rpc("create_shopping_list_item", {
      p_invite_id: invite_id,
      p_name: item.name,
      p_category: item.category,
      p_unit: item.unit,
      p_amount: item.amount,
    });
    if (error) {
      throw new Error(error.message);
    }
    return true;
  } catch (error) {
    console.error("createItem failed:", error);
    return false;
  }
}
