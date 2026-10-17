"use client";

import { useState } from "react";
import { Check, Info, Minus, Plus, Tag, Trash2, X } from "lucide-react";
import {
  formatAddedAt,
  formatNumber,
  parseNumber,
  stepForUnit,
} from "@/lib/format";
import {
  CATEGORIES,
  UNITS,
  type ShoppingItem,
  type ShoppingItemInput,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type SheetTarget =
  { mode: "add" } | { mode: "edit"; item: ShoppingItem };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: SheetTarget;
  onSave: (values: ShoppingItemInput) => Promise<void>;
  onDelete?: () => void;
};

const chipClass =
  "h-[30px] rounded-full border border-border bg-card px-3 text-[13px] font-normal shadow-none hover:bg-muted data-[state=on]:border-primary data-[state=on]:bg-secondary data-[state=on]:font-semibold data-[state=on]:text-secondary-foreground";

export default function ItemSheet({
  open,
  onOpenChange,
  target,
  onSave,
  onDelete,
}: Props) {
  const item = target.mode === "edit" ? target.item : undefined;

  const [name, setName] = useState(item?.name ?? "");
  const [qtyText, setQtyText] = useState(
    item ? formatNumber(item.quantity) : "1",
  );
  const [unit, setUnit] = useState<string>(item?.unit ?? "Stück");
  const [category, setCategory] = useState<string | null>(
    item?.category ?? null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Eigene Einheiten aus bestehenden Artikeln (z. B. "Kisten") zusätzlich anzeigen
  const unitOptions: string[] = [...UNITS];
  if (item?.unit && !unitOptions.includes(item.unit))
    unitOptions.push(item.unit);

  const qty = parseNumber(qtyText);
  const qtyInvalid = qty === null || qty <= 0;

  const stepQty = (dir: 1 | -1) => {
    const step = stepForUnit(unit);
    const next = Math.max(
      step,
      Math.round(((qty ?? 0) + dir * step) * 1000) / 1000,
    );
    setQtyText(formatNumber(next));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Bitte gib einen Artikel ein.");
    if (qtyInvalid || qty === null)
      return setError("Bitte gib eine Menge größer 0 ein.");
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: trimmed,
        quantity: qty,
        unit,
        category,
      });
    } catch (err) {
      const message =
        err &&
        typeof err === "object" &&
        "message" in err &&
        typeof err.message === "string"
          ? err.message
          : "Bitte versuche es erneut.";
      setError(`Speichern fehlgeschlagen: ${message}`);
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-[480px] rounded-t-[22px] bg-card [&>div:first-child]:mt-2 [&>div:first-child]:h-1 [&>div:first-child]:w-9">
        <form
          onSubmit={submit}
          noValidate
          className="overflow-y-auto px-4 pb-[calc(18px+env(safe-area-inset-bottom))]"
        >
          <DrawerHeader className="flex-row items-start justify-between gap-3 px-0 pt-3 pb-1 text-left md:text-left">
            <div className="flex flex-col gap-1 text-left">
              <DrawerTitle className="text-[19px] font-bold">
                {target.mode === "add"
                  ? "Artikel hinzufügen"
                  : "Artikel bearbeiten"}
              </DrawerTitle>
              {item ? (
                <DrawerDescription className="flex items-center gap-1.5 text-[11px]">
                  <span
                    className="grid size-3.5 place-items-center rounded-full text-[8px] font-bold text-white"
                    style={{ background: item.added_by_color }}
                  >
                    {item.added_by_name.charAt(0).toUpperCase()}
                  </span>
                  Hinzugefügt von {item.added_by_name} ·{" "}
                  {formatAddedAt(item.created_at)}
                </DrawerDescription>
              ) : (
                <DrawerDescription className="sr-only">
                  Neuen Artikel zur Einkaufsliste hinzufügen
                </DrawerDescription>
              )}
            </div>
            <DrawerClose asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-[10px] bg-card"
                aria-label="Schließen"
              >
                <X />
              </Button>
            </DrawerClose>
          </DrawerHeader>

          <Label
            htmlFor="item-name"
            className="mt-3.5 mb-1.5 text-[13px] font-semibold"
          >
            Artikel
          </Label>
          <div className="relative">
            <Tag className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Milch"
              autoComplete="off"
              enterKeyHint="done"
              maxLength={80}
              autoFocus={target.mode === "add"}
              className="h-11 rounded-[10px] bg-card pl-[38px] text-base md:text-base"
            />
          </div>

          <Label
            id="qty-label"
            className="mt-3.5 mb-1.5 text-[13px] font-semibold"
          >
            Menge
          </Label>
          <div
            role="group"
            aria-labelledby="qty-label"
            className="inline-flex items-center gap-1 rounded-xl bg-muted p-1"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="bg-card"
              onClick={() => stepQty(-1)}
              aria-label="Weniger"
            >
              <Minus />
            </Button>
            <Input
              value={qtyText}
              onChange={(e) =>
                setQtyText(e.target.value.replace(/[^\d.,]/g, ""))
              }
              inputMode="decimal"
              aria-label="Menge"
              aria-invalid={qtyInvalid}
              className="h-9 w-[72px] rounded-[9px] border-[1.5px] border-primary bg-card text-center text-base font-bold md:text-base"
            />
            <Button
              type="button"
              size="icon-sm"
              onClick={() => stepQty(1)}
              aria-label="Mehr"
            >
              <Plus />
            </Button>
          </div>

          <ToggleGroup
            type="single"
            spacing={2}
            value={unit ?? ""}
            onValueChange={(v) => v && setUnit(v)}
            aria-label="Einheit"
            className="mt-2.5 flex-wrap"
          >
            {unitOptions.map((u) => (
              <ToggleGroupItem
                key={u}
                value={u}
                className={`${chipClass} min-w-[34px]`}
              >
                {u}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Info className="size-3.5" />
            Kommazahlen möglich, z. B. 0,5 kg oder 1,5 l
          </p>

          <Label className="mt-3.5 mb-1.5 text-[13px] font-semibold">
            Kategorie
          </Label>
          <ToggleGroup
            type="single"
            spacing={2}
            value={category ?? ""}
            onValueChange={(v) => setCategory(v || null)}
            aria-label="Kategorie"
            className="flex-wrap"
          >
            {CATEGORIES.map((c) => (
              <ToggleGroupItem key={c} value={c} className={chipClass}>
                {c}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {error && (
            <p className="mt-3.5 text-[13px] text-destructive">{error}</p>
          )}

          <div className="mt-[22px] flex gap-2">
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                onClick={onDelete}
                className="h-[46px] basis-[38%] rounded-xl border-[1.5px] border-destructive bg-card text-[15px] font-semibold text-destructive hover:bg-destructive/5 hover:text-destructive"
              >
                <Trash2 className="size-[18px]" />
                Löschen
              </Button>
            )}
            <Button
              type="submit"
              disabled={saving}
              className="h-[46px] flex-1 rounded-xl text-[15px] font-semibold"
            >
              <Check className="size-[18px]" strokeWidth={2.2} />
              {saving ? "Speichert …" : "Speichern"}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
