"use server";

import { createClient } from "@/lib/supabase/server";
import { ActionResult } from "@/types/action-result";
import { ShoppingListHistory } from "@/types/shopping-list";

export type GetActiveItemsResult = ActionResult<ShoppingListHistory[]>;

export async function getAllActiveShoppingListItems(
  tripId: string,
): Promise<GetActiveItemsResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("shopping_list_history")
      .select(
        `
        id,
        created_at,
        shopping_list_item_id,
        bought_at,
        removed_at,
        unit,
        amount,
        shopping_list_item!inner (
          id,
          trip_id,
          category,
          name
        )
      `,
      )
      .eq("shopping_list_item.trip_id", tripId)
      .is("bought_at", null)
      .is("removed_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const formattedItems: ShoppingListHistory[] = data.map((record) => {
      const shoppingListItem = record.shopping_list_item;
      return {
        id: record.id,
        trip_id: shoppingListItem.trip_id,
        created_at: record.created_at,
        shopping_list_item_id: record.shopping_list_item_id,
        bought_at: record.bought_at,
        removed_at: record.removed_at,
        unit: record.unit,
        amount: Number(record.amount),
        shopping_list_item: shoppingListItem
          ? {
              id: shoppingListItem.id,
              category: shoppingListItem.category,
              name: shoppingListItem.name,
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
