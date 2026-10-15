"use server";

import { createClient } from "@/lib/supabase/server";
import { ActionResult } from "@/types/action-result";
import { ShoppingListHistory } from "@/types/shopping-list";
import { QueryData } from "@supabase/supabase-js";

export type GetActiveItemsResult = ActionResult<ShoppingListHistory[]>;

export async function getAllActiveShoppingListItems(
  inviteId: string,
): Promise<GetActiveItemsResult> {
  try {
    const supabase = await createClient();

    const query = supabase
      .from("shopping_list_history")
      .select(
        `
        trip_id,
        valid_from,
        shopping_list_item_id,
        bought_at,
        removed_at,
        unit,
        amount,
        trip!inner (
          invite_id
        ),
        shopping_list_item (
          id,
          category,
          name
        )
      `,
      )
      .eq("trip.invite_id", inviteId)
      .is("bought_at", null)
      .is("removed_at", null);

    type ActiveItemsQueryData = QueryData<typeof query>;

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const items: ActiveItemsQueryData = data;

    const formattedItems: ShoppingListHistory[] = items.map((record) => {
      const rawItem = Array.isArray(record.shopping_list_item)
        ? record.shopping_list_item[0]
        : record.shopping_list_item;

      return {
        trip_id: record.trip_id,
        valid_from: record.valid_from,
        shopping_list_item_id: record.shopping_list_item_id,
        bought_at: record.bought_at,
        removed_at: record.removed_at,
        unit: record.unit,
        amount: Number(record.amount),
        shopping_list_item: rawItem
          ? {
              id: rawItem.id,
              category: rawItem.category,
              name: rawItem.name,
            }
          : undefined,
      };
    });

    return { success: true, data: formattedItems };
  } catch (error) {
    console.error("getAllActiveShoppingListItems failed:", error);
    return {
      success: false,
      error: "Failed to fetch active shopping list items",
    };
  }
}
