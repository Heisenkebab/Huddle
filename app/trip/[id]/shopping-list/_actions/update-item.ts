import { createClient } from "@/lib/supabase/server";
import { ShoppingListItemBody } from "@/types/shopping-list";

export async function updateItem(
  item_id: string,
  trip_id: string,
  updateBody: Partial<ShoppingListItemBody>,
) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_shopping_list_item", {
      p_item_id: item_id,
      p_name: updateBody.name,
      p_category: updateBody.category,
      p_unit: updateBody.unit,
      p_amount: updateBody.amount,
      p_trip_id: trip_id,
    });
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error("updateItem failed:", error);
    throw new Error("Failed to update item");
  }
}
