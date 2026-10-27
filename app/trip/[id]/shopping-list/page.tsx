import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ShoppingList from "@/components/ShoppingList";
import { getTripAccess } from "@/lib/trip-access";
import { getAllActiveShoppingListItems } from "./_actions/get-all-active-items";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  // cache(): shares the DB call with the layout and the page
  const [{ trip }, t] = await Promise.all([
    getTripAccess(id),
    getTranslations("shoppingList"),
  ]);
  return { title: `${t("heading")} · ${trip.name}` };
}

export default async function ShoppingListPage({ params }: Props) {
  const { id } = await params;
  // Check here too: the layout doesn't stop the page from rendering (partial
  // rendering). Load in parallel: RLS already hides other trips' items, and a
  // failed check redirects before anything renders.
  const [, initial] = await Promise.all([
    getTripAccess(id),
    getAllActiveShoppingListItems(id),
  ]);

  return <ShoppingList initial={initial} />;
}
