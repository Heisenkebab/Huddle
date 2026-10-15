"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Copy, Info, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabase } from "@/lib/supabase";
import { errorMessage, useTrip } from "@/lib/trip-context";
import { formatQuantity } from "@/lib/format";
import { copyText } from "@/lib/clipboard";
import { showInfoToast, showUndoToast } from "@/lib/toasts";
import { cn } from "@/lib/utils";
import {
  CATEGORY_ORDER,
  type ShoppingItem,
  type ShoppingItemInput,
} from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ItemEditor, { type EditorTarget } from "./ItemEditor";
import PageHeader from "./PageHeader";
import PersonAvatar from "./PersonAvatar";

const LONG_PRESS_MS = 500;

function randomId() {
  // crypto.randomUUID fehlt in unsicheren Kontexten (z. B. http://192.168.x.x am Handy)
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ShoppingList() {
  const trip = useTrip();
  const { tripId, member, localMode, setAuthors, enterLocalMode } = trip;
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editor, setEditor] = useState<EditorTarget & { key: number }>({
    mode: "add",
    key: 0,
  });

  const openEditor = (target: EditorTarget) => {
    toast.dismiss(); // offene Toasts nicht über dem Popup stehen lassen
    setEditor((prev) => ({ ...target, key: prev.key + 1 }));
    setEditorOpen(true);
  };

  /* ---------- Laden (wartet auf die Reise) ---------- */
  useEffect(() => {
    if (trip.loading) return;
    if (localMode) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await getSupabase()
          .from("shopping_items")
          .select("*")
          .eq("trip_id", tripId)
          .order("created_at", { ascending: true });
        if (cancelled) return;
        if (error) throw error;
        setItems(data as ShoppingItem[]);
      } catch (e) {
        if (!cancelled)
          enterLocalMode(errorMessage(e, "Liste konnte nicht geladen werden."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, trip.loading, localMode]);

  /* ---------- Echtzeit ---------- */
  useEffect(() => {
    if (trip.loading || localMode) return;
    let supabase: ReturnType<typeof getSupabase>;
    try {
      supabase = getSupabase();
    } catch {
      return;
    }
    const channel = supabase
      .channel(`items:${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shopping_items",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload: RealtimePostgresChangesPayload<ShoppingItem>) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new;
              return prev.some((i) => i.id === row.id) ? prev : [...prev, row];
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new;
              return prev.map((i) => (i.id === row.id ? row : i));
            }
            if (payload.eventType === "DELETE") {
              const id = (payload.old as Partial<ShoppingItem>).id;
              return prev.filter((i) => i.id !== id);
            }
            return prev;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, trip.loading, localMode]);

  /* Autor:innen an die Sidebar ("Mitreisende") melden */
  useEffect(() => {
    setAuthors(
      items.map((i) => ({ name: i.added_by_name, color: i.added_by_color })),
    );
  }, [items, setAuthors]);

  /* ---------- Aktionen ---------- */
  const togglePurchased = async (item: ShoppingItem, next: boolean) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, purchased: next } : i)),
    );
    if (localMode) return;
    const { error } = await getSupabase()
      .from("shopping_items")
      .update({ purchased: next })
      .eq("id", item.id);
    if (error) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, purchased: item.purchased } : i,
        ),
      );
      toast.error("Änderung konnte nicht gespeichert werden.", {
        description: error.message,
      });
    }
  };

  const addItem = async (values: ShoppingItemInput) => {
    if (localMode) {
      const row: ShoppingItem = {
        ...values,
        id: randomId(),
        trip_id: tripId,
        description: null,
        purchased: false,
        added_by_name: member.name,
        added_by_color: member.color,
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, row]);
      return;
    }
    const { data, error } = await getSupabase()
      .from("shopping_items")
      .insert({
        ...values,
        trip_id: tripId,
        added_by_name: member.name,
        added_by_color: member.color,
      })
      .select()
      .single();
    if (error) throw error;
    const row = data as ShoppingItem;
    setItems((prev) =>
      prev.some((i) => i.id === row.id) ? prev : [...prev, row],
    );
  };

  const updateItem = async (id: string, values: ShoppingItemInput) => {
    if (localMode) {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...values } : i)),
      );
      return;
    }
    const { data, error } = await getSupabase()
      .from("shopping_items")
      .update(values)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    const row = data as ShoppingItem;
    setItems((prev) => prev.map((i) => (i.id === row.id ? row : i)));
  };

  const deleteItem = async (item: ShoppingItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    const restoreLocal = () =>
      setItems((prev) =>
        prev.some((i) => i.id === item.id) ? prev : [...prev, item],
      );
    const message = `„${item.name}“ gelöscht`;

    if (localMode) {
      showUndoToast(message, restoreLocal);
      return;
    }
    const { error } = await getSupabase()
      .from("shopping_items")
      .delete()
      .eq("id", item.id);
    if (error) {
      restoreLocal();
      toast.error("Artikel konnte nicht gelöscht werden.", {
        description: error.message,
      });
      return;
    }
    showUndoToast(message, async () => {
      const { error: restoreError } = await getSupabase()
        .from("shopping_items")
        .insert(item);
      if (restoreError) {
        toast.error("Wiederherstellen fehlgeschlagen.", {
          description: restoreError.message,
        });
        return;
      }
      restoreLocal();
    });
  };

  /* ---------- Gruppierung nach Kategorie ---------- */
  const groups = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const item of [...items].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    )) {
      const key = item.category ?? "Sonstiges";
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()].sort(
      ([a], [b]) => rank(a) - rank(b) || a.localeCompare(b, "de"),
    );
  }, [items]);

  const openCount = items.filter((i) => !i.purchased).length;

  /* ---------- WhatsApp-Brücke: offene Artikel als Klartext ---------- */
  const copyForWhatsApp = async () => {
    const lines = [
      `🛒 *Einkaufsliste${trip.trip?.name ? ` – ${trip.trip.name}` : ""}*`,
    ];
    for (const [category, list] of groups) {
      const open = list.filter((i) => !i.purchased);
      if (open.length === 0) continue;
      lines.push("", `*${category}*`);
      for (const i of open) {
        const qty = formatQuantity(i.quantity, i.unit);
        lines.push(`• ${i.name}${qty ? ` (${qty})` : ""}`);
      }
    }
    if (openCount === 0) lines.push("", "Alles erledigt ✅");
    const ok = await copyText(lines.join("\n"));
    showInfoToast(
      ok ? "Liste für WhatsApp kopiert" : "Kopieren nicht möglich",
      <Copy />,
    );
  };

  const busy = trip.loading || loading;

  return (
    <>
      <PageHeader title="Einkauf" />

      {trip.error && (
        <Alert className="mb-4 rounded-2xl border-coral/40 bg-coral/5 dark:bg-[#3a2a23]">
          <Info className="text-coral" />
          <AlertTitle>Vorschaumodus</AlertTitle>
          <AlertDescription>
            <p>{trip.error}</p>
            <p>
              Du kannst Artikel trotzdem hinzufügen – sie werden nur lokal
              angezeigt und nicht gespeichert.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Laptop: alles in einer Karte (Entwurf LE1) */}
      <section className="lg:rounded-[28px] lg:border lg:bg-card/60 lg:p-6 lg:shadow-[0_1px_2px_rgb(30_28_24/0.04)] dark:lg:bg-[#232323]">
        <div className="mb-5 hidden items-center gap-3 lg:flex">
          <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
            <ShoppingCart className="size-5" strokeWidth={1.8} />
          </span>
          <div className="mr-auto">
            <h2 className="text-lg font-bold">Einkaufsliste</h2>
            <p className="text-xs text-muted-foreground">
              {openCount} offen · Antippen = gekauft
            </p>
          </div>
          <Button
            variant="outline"
            onClick={copyForWhatsApp}
            className="rounded-full bg-card"
          >
            <Copy />
            Für WhatsApp kopieren
          </Button>
          <Button
            onClick={() => openEditor({ mode: "add" })}
            disabled={busy}
            className="rounded-full bg-coral font-semibold text-coral-foreground shadow-[0_6px_16px_rgb(239_107_74/0.3)] hover:bg-coral/90"
          >
            <Plus />
            Artikel hinzufügen
          </Button>
        </div>

        {busy && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Lade Einkaufsliste …
          </p>
        )}

        {!busy && items.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Die Liste ist noch leer. Füge den ersten Artikel hinzu.
          </p>
        )}

        {groups.map(([category, list]) => (
          <div key={category} className="mb-4 last:mb-0">
            <h3 className="mb-1.5 ml-1 text-[11px] font-bold tracking-[0.08em] text-foreground/70 uppercase">
              {category}
            </h3>
            <ul className="divide-y overflow-hidden rounded-[20px] border bg-card dark:shadow-[0_2px_8px_rgb(0_0_0/0.5)]">
              {list.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={(next) => togglePurchased(item, next)}
                  onEdit={() => openEditor({ mode: "edit", item })}
                  onDelete={() => deleteItem(item)}
                />
              ))}
            </ul>
          </div>
        ))}
      </section>

      {items.length > 0 && (
        <p className="mt-[18px] text-center text-xs text-muted-foreground/70 lg:hidden">
          Antippen = gekauft · Gedrückt halten für Details
        </p>
      )}

      {/* Mobil: schwebender Button */}
      <Button
        size="lg"
        disabled={busy}
        onClick={() => openEditor({ mode: "add" })}
        className="fixed right-[max(16px,calc(50%-224px))] bottom-[calc(96px+env(safe-area-inset-bottom))] z-10 h-13 rounded-full bg-coral px-6 text-[15px] font-semibold text-coral-foreground shadow-[0_10px_24px_rgb(239_107_74/0.38)] hover:bg-coral/90 lg:hidden"
      >
        <Plus className="size-5" strokeWidth={2.2} />
        Artikel
      </Button>

      <ItemEditor
        key={editor.key}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        target={editor}
        onSave={async (values) => {
          if (editor.mode === "edit") await updateItem(editor.item.id, values);
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

function rank(category: string) {
  const i = CATEGORY_ORDER.indexOf(category);
  return i === -1 ? CATEGORY_ORDER.length - 1 : i;
}

/* ---------- Eine Zeile: Antippen = gekauft, Gedrückthalten = Details, Laptop-Hover = Aktionen ---------- */
function ItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: ShoppingItem;
  onToggle: (next: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const longPressed = useRef(false);
  const checkboxId = `item-${item.id}`;

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <li className="group/row">
      {/* Die ganze Zeile ist das Label der Checkbox → Antippen schaltet "gekauft" um */}
      <label
        htmlFor={checkboxId}
        className="flex items-center gap-3.5 px-4 py-3 transition-colors select-none [-webkit-touch-callout:none] active:bg-muted/60 lg:hover:bg-muted/60"
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          longPressed.current = false;
          start.current = { x: e.clientX, y: e.clientY };
          timer.current = setTimeout(() => {
            longPressed.current = true;
            if (navigator.vibrate) navigator.vibrate(15);
            onEdit();
          }, LONG_PRESS_MS);
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          if (
            Math.hypot(
              e.clientX - start.current.x,
              e.clientY - start.current.y,
            ) > 10
          )
            clear();
        }}
        onPointerUp={clear}
        onPointerLeave={clear}
        onPointerCancel={clear}
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          // Nach Gedrückthalten nicht zusätzlich abhaken
          if (longPressed.current) e.preventDefault();
        }}
      >
        <Checkbox
          id={checkboxId}
          checked={item.purchased}
          onCheckedChange={(v) => onToggle(v === true)}
          onKeyDown={(e) => {
            // Tastatur: Shift+Enter öffnet Details
            if (e.key === "Enter" && e.shiftKey) {
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
          {(item.quantity != null || item.unit) && (
            <span
              className={cn(
                "text-xs text-muted-foreground",
                item.purchased && "opacity-50",
              )}
            >
              {formatQuantity(item.quantity, item.unit)}
            </span>
          )}
        </span>

        {/* Laptop: Bearbeiten/Löschen beim Hovern (Entwurf LE1) */}
        <span
          className="hidden items-center gap-1.5 opacity-0 transition-opacity group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100 lg:flex"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Bearbeiten"
                className="size-8 rounded-full bg-card"
                onClick={(e) => {
                  e.preventDefault();
                  onEdit();
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>Bearbeiten</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Löschen"
                className="size-8 rounded-full border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  onDelete();
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>Löschen</TooltipContent>
          </Tooltip>
        </span>

        <PersonAvatar
          name={item.added_by_name}
          color={item.added_by_color}
          className={cn(item.purchased && "opacity-50")}
          title={`Hinzugefügt von ${item.added_by_name}`}
        />
      </label>
    </li>
  );
}
