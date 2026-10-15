import { redirect } from "next/navigation";

/** /trip/[id] → /trip/[id]/shopping-list */
export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/trip/${id}/shopping-list`);
}
