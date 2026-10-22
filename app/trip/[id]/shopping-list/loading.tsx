import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/PageHeader";

const SKELETON_ROWS = 4;

/** Shown while page.tsx loads the items (streaming instead of a blank page) */
export default async function ShoppingListLoading() {
  const t = await getTranslations("shoppingList");

  return (
    <>
      <PageHeader title={t("title")} />
      <section
        aria-busy="true"
        aria-label={t("loading")}
        className="lg:rounded-[28px] lg:border lg:bg-card/60 lg:p-6 dark:lg:bg-[#232323]"
      >
        <div className="mb-1.5 ml-1 h-3 w-20 animate-pulse rounded bg-muted" />
        <ul className="divide-y overflow-hidden rounded-[20px] border bg-card">
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <li key={i} className="flex items-center gap-3.5 px-4 py-3">
              <span className="size-[22px] animate-pulse rounded-[7px] bg-muted" />
              <span className="flex flex-1 flex-col gap-1.5">
                <span className="h-3.5 w-2/5 animate-pulse rounded bg-muted" />
                <span className="h-3 w-12 animate-pulse rounded bg-muted" />
              </span>
              <span className="size-7 animate-pulse rounded-full bg-muted" />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
