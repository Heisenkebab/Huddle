import { Category, Unit } from "@/types/shopping-list";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "./admin-client";

const admin = createAdminClient();

export async function seedItem(tripId: string) {
  const id = randomUUID();
  const { error } = await admin
    .from("shopping_list_item")
    .insert({ id, trip_id: tripId, name: "Milk", category: Category.CHILLED });
  if (error) throw error;
  return id;
}

export async function getHistory(itemId: string) {
  const { data, error } = await admin
    .from("shopping_list_history")
    .select("shopping_list_item_id, unit, amount, bought_at, removed_at")
    .eq("shopping_list_item_id", itemId)
    .order("created_at");
  if (error) throw error;
  return data;
}

// created_at can be set explicitly, so which entry is the latest one doesn't
// depend on rows inserted within the same millisecond
export async function addEntry(
  itemId: string,
  entry: { created_at?: string; bought_at?: string; removed_at?: string } = {},
) {
  const { data, error } = await admin
    .from("shopping_list_history")
    .insert({
      shopping_list_item_id: itemId,
      unit: Unit.LITER,
      amount: 1,
      ...entry,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function getEntry(entryId: string) {
  const { data, error } = await admin
    .from("shopping_list_history")
    .select("bought_at, removed_at, updated_at, updated_by")
    .eq("id", entryId)
    .single();
  if (error) throw error;
  return data;
}
