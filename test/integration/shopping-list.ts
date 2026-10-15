import { createAdminClient } from "./admin-client";

const admin = createAdminClient();

export async function getHistory(itemId: string) {
  const { data, error } = await admin
    .from("shopping_list_history")
    .select("shopping_list_item_id, unit, amount, bought_at, removed_at")
    .eq("shopping_list_item_id", itemId)
    .order("created_at");
  if (error) throw error;
  return data;
}
