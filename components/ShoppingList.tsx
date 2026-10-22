"use client";

import { createItem } from "@/app/trip/[id]/shopping-list/_actions/create-item";
import {
  getAllActiveShoppingListItems,
  type GetActiveItemsResult,
} from "@/app/trip/[id]/shopping-list/_actions/get-all-active-items";
import removeShoppingListItem from "@/app/trip/[id]/shopping-list/_actions/remove-item";
import restoreRemovedShoppingListItem from "@/app/trip/[id]/shopping-list/_actions/restore-removed-item";
import { setShoppingListItemBought } from "@/app/trip/[id]/shopping-list/_actions/set-item-bought";
import { updateItem } from "@/app/trip/[id]/shopping-list/_actions/update-item";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { copyText } from "@/lib/clipboard";
import { formatQuantity } from "@/lib/format";
import {
  authorOf,
  categoryToDb,
  toShoppingItem,
  unitToDb,
} from "@/lib/shopping-list";
import { createClient } from "@/lib/supabase/client";
import { showInfoToast, showUndoToast } from "@/lib/toasts";
import { useTrip } from "@/lib/trip-context";
import {
  CATEGORY_ORDER,
  type CategoryKey,
  type ShoppingItem,
  type ShoppingItemInput,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ShoppingListItemBody } from "@/types/shopping-list";
import {
  Copy,
  Pencil,
  Plus,
  RotateCw,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import ItemEditor, { type EditorTarget } from "./ItemEditor";
import PageHeader from "./PageHeader";
import PersonAvatar from "./PersonAvatar";

const LONG_PRESS_MS = 500;
const SWIPE_ACTION_PX = 88; // Width of the red "delete" area
const FULL_SWIPE_RATIO = 0.6; // swiping past this share of the row width deletes right away
const COLLAPSE_MS = 220;
const REFRESH_DEBOUNCE_MS = 200;

export default function ShoppingList({
  initial,
}: {
  /** Loaded on the server (page.tsx), so the list shows up right away */
  initial: GetActiveItemsResult;
}) {
  const trip = useTrip();
  const { tripId, setAuthors } = trip;
  const t = useTranslations();
  const locale = useLocale();
  const [items, setItems] = useState<ShoppingItem[]>(() =>
    initial.success ? initial.data.map(toShoppingItem) : [],
  );
  const [loadFailed, setLoadFailed] = useState(!initial.success);
  const [reloading, setReloading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  // At most one row is swiped open
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorTarget & { key: number }>({
    mode: "add",
    key: 0,
  });

  const openEditor = (target: EditorTarget) => {
    toast.dismiss(); // don't leave open toasts on top of the popup
    setEditor((prev) => ({ ...target, key: prev.key + 1 }));
    setEditorOpen(true);
  };

  /* ---------- Loading ---------- */
  // Only the newest request's response counts. Optimistic updates bump the
  // counter too, so an older response can't overwrite them.
  const latestRequest = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++latestRequest.current;
    const result = await getAllActiveShoppingListItems(tripId);
    if (request !== latestRequest.current) return;
    if (!result.success) {
      setLoadFailed(true);
      return;
    }
    setLoadFailed(false);
    setItems(result.data.map(toShoppingItem));
  }, [tripId]);

  const retryLoad = async () => {
    setReloading(true);
    await refresh();
    setReloading(false);
  };

  /* ---------- Realtime: refetch when others change the list ---------- */
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // One action often changes both item and history → refetch only once
    const scheduleRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, REFRESH_DEBOUNCE_MS);
    };
    const channel = supabase
      .channel(`shopping-list:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_list_item",
          filter: `trip_id=eq.${tripId}`,
        },
        scheduleRefresh,
      )
      // History rows have no trip_id; RLS only delivers rows of the user's own
      // trips, so changes in another trip at worst cause a needless refetch
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_list_history" },
        scheduleRefresh,
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [tripId, refresh]);

  /* Report authors to the sidebar (fellow travellers) */
  useEffect(() => {
    setAuthors(
      items.flatMap((i) =>
        i.added_by_name && i.added_by_color
          ? [{ name: i.added_by_name, color: i.added_by_color }]
          : [],
      ),
    );
  }, [items, setAuthors]);

  /* ---------- Actions ---------- */
  const togglePurchased = async (item: ShoppingItem, next: boolean) => {
    latestRequest.current++;
    const boughtAt = next ? new Date().toISOString() : null;
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, purchased: next, bought_at: boughtAt } : i,
      ),
    );
    const result = await setShoppingListItemBought(tripId, item.id, next);
    if (!result.success) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, purchased: item.purchased, bought_at: item.bought_at }
            : i,
        ),
      );
      toast.error(t("shoppingList.saveFailed"), {
        description: result.error,
      });
    }
  };

  // Throw on failure so the editor stays open and shows the message
  const addItem = async (values: ShoppingItemInput) => {
    const result = await createItem(tripId, {
      name: values.name,
      category: categoryToDb(values.category),
      unit: unitToDb(values.unit),
      amount: values.quantity,
    });
    if (!result.success) throw new Error(result.error);
    // Created, or merged into an open entry → refetch
    await refresh();
  };

  const editItem = async (item: ShoppingItem, values: ShoppingItemInput) => {
    // Only send what changed, so an untouched amount isn't rewritten
    const body: Partial<ShoppingListItemBody> = {};
    if (values.name !== item.name) body.name = values.name;
    if (values.category !== item.category)
      body.category = categoryToDb(values.category);
    if (values.unit !== item.unit) body.unit = unitToDb(values.unit);
    if (values.quantity !== item.quantity) body.amount = values.quantity;
    if (Object.keys(body).length === 0) return;

    const result = await updateItem(tripId, item.id, body);
    if (!result.success) throw new Error(result.error);
    await refresh();
  };

  // Bought items can't be removed (DB constraint), so the row only offers
  // delete for open items
  const deleteItem = async (item: ShoppingItem) => {
    latestRequest.current++;
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const restoreLocal = () =>
      setItems((prev) =>
        prev.some((i) => i.id === item.id) ? prev : [...prev, item],
      );

    const result = await removeShoppingListItem(tripId, item.id);
    if (!result.success) {
      restoreLocal();
      toast.error(t("shoppingList.deleteFailed"), {
        description: result.error,
      });
      return;
    }
    showUndoToast(
      t("shoppingList.deleted", { name: item.name }),
      t("toasts.undo"),
      async () => {
        const restored = await restoreRemovedShoppingListItem(tripId, item.id);
        if (!restored.success) {
          toast.error(t("shoppingList.restoreFailed"), {
            description: restored.error,
          });
          return;
        }
        restoreLocal();
        await refresh();
      },
    );
  };

  /* ---------- Open items by category, bought items in one section below ---------- */
  // Bought rows would otherwise fill the screen while shopping and push the
  // open ones out of view
  const { openGroups, bought } = useMemo(() => {
    const map = new Map<CategoryKey, ShoppingItem[]>();
    for (const item of items
      .filter((i) => !i.purchased)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      map.set(item.category, [...(map.get(item.category) ?? []), item]);
    }
    return {
      openGroups: [...map.entries()].sort(([a], [b]) => rank(a) - rank(b)),
      // Newest first: a mis-tap shows up right below the open items
      bought: items
        .filter((i) => i.purchased)
        .sort((a, b) => (b.bought_at ?? "").localeCompare(a.bought_at ?? "")),
    };
  }, [items]);

  const openCount = items.length - bought.length;

  // Each category, then "Bought": same heading + card markup for all
  const sections = [
    ...openGroups.map(([category, list]) => ({
      key: category,
      title: t(`categories.${category}`),
      list,
    })),
    ...(bought.length > 0
      ? [
          {
            key: "bought",
            title: t("shoppingList.bought", { count: bought.length }),
            list: bought,
          },
        ]
      : []),
  ];

  /* ---------- WhatsApp bridge: open items as plain text ---------- */
  const copyForWhatsApp = async () => {
    const lines = [
      `🛒 *${t("shoppingList.whatsAppTitle")}${trip.trip?.name ? ` – ${trip.trip.name}` : ""}*`,
    ];
    for (const [category, list] of openGroups) {
      lines.push("", `*${t(`categories.${category}`)}*`);
      for (const i of list) {
        const qty = formatQuantity(i.quantity, t(`units.${i.unit}`), locale);
        lines.push(`• ${i.name}${qty ? ` (${qty})` : ""}`);
      }
    }
    if (openCount === 0) lines.push("", t("shoppingList.allDone"));
    const ok = await copyText(lines.join("\n"));
    showInfoToast(
      ok ? t("shoppingList.copiedForWhatsApp") : t("trip.copyFailed"),
      <Copy />,
    );
  };

  return (
    <>
      <PageHeader title={t("shoppingList.title")} />

      {/* Laptop: everything in one card (design LE1) */}
      <section className="lg:rounded-[28px] lg:border lg:bg-card/60 lg:p-6 lg:shadow-[0_1px_2px_rgb(30_28_24/0.04)] dark:lg:bg-[#232323]">
        <div className="mb-5 hidden items-center gap-3 lg:flex">
          <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
            <ShoppingCart className="size-5" strokeWidth={1.8} />
          </span>
          <div className="mr-auto">
            <h2 className="text-lg font-bold">{t("shoppingList.heading")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("shoppingList.openCount", { count: openCount })}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={copyForWhatsApp}
            className="rounded-full bg-card"
          >
            <Copy />
            {t("shoppingList.copyForWhatsApp")}
          </Button>
          <Button
            onClick={() => openEditor({ mode: "add" })}
            className="rounded-full bg-coral font-semibold text-coral-foreground shadow-[0_6px_16px_rgb(239_107_74/0.3)] hover:bg-coral/90"
          >
            <Plus />
            {t("shoppingList.addItem")}
          </Button>
        </div>

        {loadFailed && (
          <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-muted-foreground">
            <p>{t("shoppingList.loadFailed")}</p>
            <Button
              variant="outline"
              onClick={retryLoad}
              disabled={reloading}
              className="rounded-full bg-card"
            >
              <RotateCw className={cn(reloading && "animate-spin")} />
              {t("shoppingList.retry")}
            </Button>
          </div>
        )}

        {!loadFailed && items.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("shoppingList.empty")}
          </p>
        )}

        {sections.map((section) => (
          <div key={section.key} className="mb-4 last:mb-0">
            <h3 className="mb-1.5 ml-1 text-[11px] font-bold tracking-[0.08em] text-foreground/70 uppercase">
              {section.title}
            </h3>
            <ul className="divide-y overflow-hidden rounded-[20px] border bg-card dark:shadow-[0_2px_8px_rgb(0_0_0/0.5)]">
              {section.list.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  swiped={swipedId === item.id && !item.purchased}
                  onSwipedChange={(open) =>
                    setSwipedId((prev) =>
                      open ? item.id : prev === item.id ? null : prev,
                    )
                  }
                  onToggle={(next) => togglePurchased(item, next)}
                  // Bought items are read-only: they can only be unticked
                  onEdit={
                    item.purchased
                      ? undefined
                      : () => openEditor({ mode: "edit", item })
                  }
                  onDelete={item.purchased ? undefined : () => deleteItem(item)}
                />
              ))}
            </ul>
          </div>
        ))}
      </section>

      {items.length > 0 && (
        <p className="mt-[18px] text-center text-xs text-muted-foreground/70 lg:hidden">
          {t("shoppingList.hint")}
        </p>
      )}

      {/* Mobile: floating button */}
      <Button
        size="lg"
        onClick={() => openEditor({ mode: "add" })}
        className="fixed right-[max(16px,calc(50%-224px))] bottom-[calc(96px+env(safe-area-inset-bottom))] z-10 h-13 rounded-full bg-coral px-6 text-[15px] font-semibold text-coral-foreground shadow-[0_10px_24px_rgb(239_107_74/0.38)] hover:bg-coral/90 lg:hidden"
      >
        <Plus className="size-5" strokeWidth={2.2} />
        {t("shoppingList.addItemShort")}
      </Button>

      <ItemEditor
        key={editor.key}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        target={editor}
        onSave={async (values) => {
          if (editor.mode === "edit") await editItem(editor.item, values);
          else await addItem(values);
          setEditorOpen(false);
        }}
        onDelete={
          editor.mode === "edit"
            ? () => {
                setEditorOpen(false);
                deleteItem(editor.item);
              }
            : undefined
        }
      />
    </>
  );
}

function rank(category: CategoryKey) {
  const i = CATEGORY_ORDER.indexOf(category);
  return i === -1 ? CATEGORY_ORDER.length - 1 : i;
}

/* ---------- One row: tap = bought, long press = details, swipe left = delete, laptop hover = actions.
   Bought rows have no onEdit/onDelete: only tapping works. ---------- */
function ItemRow({
  item,
  swiped,
  onSwipedChange,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: ShoppingItem;
  swiped: boolean;
  onSwipedChange: (open: boolean) => void;
  onToggle: (next: boolean) => void;
  /** Missing for bought items: no long press, no edit button */
  onEdit?: () => void;
  /** Missing for bought items: no swipe, no delete button */
  onDelete?: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{
    x: number;
    y: number;
    base: number;
    width: number;
  } | null>(null);
  const axis = useRef<"x" | "y" | null>(null);
  const longPressed = useRef(false);
  const didSwipe = useRef(false);
  const [drag, setDrag] = useState<number | null>(null); // Offset in px while swiping
  const [slideOut, setSlideOut] = useState(false);
  const [removing, setRemoving] = useState(false);
  const checkboxId = `item-${item.id}`;
  const author = authorOf(item, t("trip.guest"));

  useEffect(
    () => () => {
      if (removeTimer.current) clearTimeout(removeTimer.current);
    },
    [],
  );

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  /* Collapse the row first, then remove it from the list */
  const remove = (fullSwipe = false) => {
    if (removing || !onDelete) return;
    setSlideOut(fullSwipe);
    setRemoving(true);
    onSwipedChange(false);
    removeTimer.current = setTimeout(onDelete, COLLAPSE_MS);
  };

  const endSwipe = (commit: boolean) => {
    const width = start.current?.width ?? 0;
    start.current = null;
    axis.current = null;
    setDrag(null);
    if (!commit || drag === null) return;
    if (-drag > width * FULL_SWIPE_RATIO) remove(true);
    else onSwipedChange(-drag > SWIPE_ACTION_PX / 2);
  };

  const offset = drag ?? (slideOut ? "-100%" : swiped ? -SWIPE_ACTION_PX : 0);
  const showAction = drag !== null || swiped || slideOut;

  return (
    <li
      className="group/row grid transition-[grid-template-rows,opacity] ease-out"
      style={{
        gridTemplateRows: removing ? "0fr" : "1fr",
        opacity: removing ? 0 : 1,
        transitionDuration: `${COLLAPSE_MS}ms`,
      }}
    >
      <div className="relative min-h-0 overflow-hidden">
        {/* Mobile: red "delete" area under the row (design E2) */}
        {showAction && (
          <div className="absolute inset-0 flex justify-end bg-destructive text-white">
            <button
              type="button"
              tabIndex={swiped ? 0 : -1}
              onClick={() => remove()}
              className="flex flex-col items-center justify-center gap-0.5 text-xs font-semibold"
              style={{ width: SWIPE_ACTION_PX }}
            >
              <Trash2 className="size-5" />
              {t("shoppingList.delete")}
            </button>
          </div>
        )}

        <div
          className={cn(
            "relative bg-card",
            drag === null && "transition-transform duration-200 ease-out",
          )}
          style={{
            transform: `translateX(${typeof offset === "number" ? `${offset}px` : offset})`,
          }}
        >
          {/* The whole row is the checkbox label → tapping toggles "bought" */}
          <label
            htmlFor={checkboxId}
            className="flex touch-pan-y items-center gap-3.5 px-4 py-3 transition-colors select-none [-webkit-touch-callout:none] active:bg-muted/60 lg:hover:bg-muted/60"
            onPointerDown={(e) => {
              if (e.pointerType === "mouse" && e.button !== 0) return;
              longPressed.current = false;
              didSwipe.current = false;
              axis.current = null;
              start.current = {
                x: e.clientX,
                y: e.clientY,
                base: swiped ? -SWIPE_ACTION_PX : 0,
                width: e.currentTarget.offsetWidth,
              };
              // Swiped row: tapping only slides it back. Bought row: no long press
              if (swiped || !onEdit) return;
              timer.current = setTimeout(() => {
                longPressed.current = true;
                if (navigator.vibrate) navigator.vibrate(15);
                onEdit();
              }, LONG_PRESS_MS);
            }}
            onPointerMove={(e) => {
              const s = start.current;
              if (!s) return;
              const dx = e.clientX - s.x;
              const dy = e.clientY - s.y;
              if (!axis.current) {
                if (Math.hypot(dx, dy) <= 10) return;
                clear();
                // Swipe only with finger/pen; a mouse gets the hover buttons on laptop
                axis.current =
                  onDelete &&
                  e.pointerType !== "mouse" &&
                  Math.abs(dx) > Math.abs(dy)
                    ? "x"
                    : "y";
                if (axis.current === "x") {
                  didSwipe.current = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                }
              }
              if (axis.current === "x")
                setDrag(Math.max(-s.width, Math.min(0, s.base + dx)));
            }}
            onPointerUp={() => {
              clear();
              endSwipe(true);
            }}
            onPointerLeave={clear}
            onPointerCancel={() => {
              clear();
              endSwipe(false);
            }}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => {
              // Don't also tick the item after a long press or swipe
              if (longPressed.current || didSwipe.current) {
                e.preventDefault();
                didSwipe.current = false;
                return;
              }
              // Tapping a swiped row slides it back
              if (swiped) {
                e.preventDefault();
                onSwipedChange(false);
              }
            }}
          >
            <Checkbox
              id={checkboxId}
              checked={item.purchased}
              onCheckedChange={(v) => onToggle(v === true)}
              onKeyDown={(e) => {
                // Keyboard: Shift+Enter opens details
                if (e.key === "Enter" && e.shiftKey && onEdit) {
                  e.preventDefault();
                  onEdit();
                }
              }}
              aria-label={item.name}
              className="pointer-events-none size-[22px] rounded-[7px] border-[1.5px] border-[#c9c4ba] shadow-none dark:border-[#6b6b6b] [&_svg]:size-4"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span
                className={cn(
                  "text-[15px] font-medium",
                  item.purchased && "text-muted-foreground/60 line-through",
                )}
              >
                {item.name}
              </span>
              <span
                className={cn(
                  "text-xs text-muted-foreground",
                  item.purchased && "opacity-50",
                )}
              >
                {formatQuantity(item.quantity, t(`units.${item.unit}`), locale)}
              </span>
            </span>

            {/* Laptop: edit/delete on hover (design LE1) */}
            {(onEdit || onDelete) && (
              <span
                className="hidden items-center gap-1.5 opacity-0 transition-opacity group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100 lg:flex"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {onEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={t("shoppingList.edit")}
                        className="size-8 rounded-full bg-card"
                        onClick={(e) => {
                          e.preventDefault();
                          onEdit();
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      {t("shoppingList.edit")}
                    </TooltipContent>
                  </Tooltip>
                )}
                {onDelete && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={t("shoppingList.delete")}
                        className="size-8 rounded-full border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          remove();
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      {t("shoppingList.delete")}
                    </TooltipContent>
                  </Tooltip>
                )}
              </span>
            )}

            <PersonAvatar
              name={author.name}
              color={author.color}
              className={cn(item.purchased && "opacity-50")}
              title={t("shoppingList.addedBy", { name: author.name })}
            />
          </label>
        </div>
      </div>
    </li>
  );
}
