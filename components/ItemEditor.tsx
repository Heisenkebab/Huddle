"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { Check, Info, Minus, Plus, Tag, Trash2, X } from "lucide-react";
import { formatAddedAt, formatNumber, parseNumber, stepForUnit } from "@/lib/format";
import { CATEGORIES, UNITS, type ShoppingItem, type ShoppingItemInput } from "@/lib/types";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import PersonAvatar from "./PersonAvatar";

export type EditorTarget = { mode: "add" } | { mode: "edit"; item: ShoppingItem };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: EditorTarget;
  onSave: (values: ShoppingItemInput) => Promise<void>;
  onDelete?: () => void;
};

/** Mobil: Bottom Sheet (Drawer). Laptop: zentrierter Dialog. */
export default function ItemEditor(props: Props) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  if (isDesktop) {
    return (
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent showCloseButton={false} className="max-w-[520px] gap-0 rounded-[28px] border-0 bg-card p-6 shadow-2xl sm:max-w-[520px]">
          <ItemForm {...props} layout="dialog" Title={DialogTitle} Description={DialogDescription} Close={DialogClose} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={props.open} onOpenChange={props.onOpenChange}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-[480px] rounded-t-[28px] border-0 bg-card [&>div:first-child]:mt-2.5 [&>div:first-child]:h-1 [&>div:first-child]:w-10">
        <ItemForm {...props} layout="sheet" Title={DrawerTitle} Description={DrawerDescription} Close={DrawerClose} />
      </DrawerContent>
    </Drawer>
  );
}

const chipClass =
  "h-8 rounded-full border border-border bg-card px-3.5 text-[13px] font-normal shadow-none hover:bg-muted data-[state=on]:border-primary data-[state=on]:bg-secondary data-[state=on]:font-semibold data-[state=on]:text-secondary-foreground";

type FormProps = Props & {
  layout: "sheet" | "dialog";
  Title: ComponentType<{ className?: string; children: ReactNode }>;
  Description: ComponentType<{ className?: string; children: ReactNode }>;
  Close: ComponentType<{ asChild?: boolean; children: ReactNode }>;
};

function ItemForm({ target, onSave, onDelete, layout, Title, Description, Close }: FormProps) {
  const item = target.mode === "edit" ? target.item : undefined;
  const isDialog = layout === "dialog";

  const [name, setName] = useState(item?.name ?? "");
  const [qtyText, setQtyText] = useState(item?.quantity != null ? formatNumber(item.quantity) : "1");
  const [unit, setUnit] = useState<string | null>(item ? item.unit : "Stück");
  const [category, setCategory] = useState<string | null>(item?.category ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Eigene Einheiten aus bestehenden Artikeln (z. B. "Kisten") zusätzlich anzeigen
  const unitOptions: string[] = [...UNITS];
  if (item?.unit && !unitOptions.includes(item.unit)) unitOptions.push(item.unit);

  const qty = parseNumber(qtyText);
  const qtyInvalid = qtyText.trim() !== "" && qty === null;

  const stepQty = (dir: 1 | -1) => {
    const step = stepForUnit(unit);
    const next = Math.max(step, Math.round(((qty ?? 0) + dir * step) * 1000) / 1000);
    setQtyText(formatNumber(next));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Bitte gib einen Artikel ein.");
    if (qtyInvalid) return setError("Die Menge ist keine gültige Zahl.");
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: trimmed, quantity: qty, unit: qty == null ? null : unit, category });
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : "Bitte versuche es erneut.";
      setError(`Speichern fehlgeschlagen: ${message}`);
      setSaving(false);
    }
  };

  const units = (
    <ToggleGroup
      type="single"
      spacing={2}
      value={unit ?? ""}
      onValueChange={(v) => v && setUnit(v)}
      aria-label="Einheit"
      className="flex-wrap"
    >
      {unitOptions.map((u) => (
        <ToggleGroupItem key={u} value={u} className={`${chipClass} min-w-9`}>
          {u}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn(!isDialog && "overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom))]")}
    >
      {/* Kopf */}
      <div className={cn("flex items-start justify-between gap-3", isDialog ? "mb-1" : "pt-3 pb-1")}>
        <div className="flex flex-col gap-1 text-left">
          <Title className="text-[19px] leading-tight font-bold">
            {target.mode === "add" ? "Artikel hinzufügen" : "Artikel bearbeiten"}
          </Title>
          {item ? (
            <Description className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <PersonAvatar name={item.added_by_name} color={item.added_by_color} size={14} />
              Hinzugefügt von {item.added_by_name} · {formatAddedAt(item.created_at)}
            </Description>
          ) : (
            <Description className="sr-only">Neuen Artikel zur Einkaufsliste hinzufügen</Description>
          )}
        </div>
        <Close asChild>
          <Button type="button" variant="outline" size="icon" className="rounded-full bg-card" aria-label="Schließen">
            <X />
          </Button>
        </Close>
      </div>

      {/* Artikel */}
      <Label htmlFor="item-name" className="mt-4 mb-2 text-[13px] font-semibold">
        Artikel
      </Label>
      <div className="relative">
        <Tag className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
        <Input
          id="item-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Milch"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={80}
          autoFocus={target.mode === "add"}
          className="h-11 rounded-2xl bg-card pl-10 text-base md:text-base"
        />
      </div>

      {/* Menge (+ Einheit daneben am Laptop) */}
      <Label id="qty-label" className="mt-4 mb-2 text-[13px] font-semibold">
        Menge
      </Label>
      <div className={cn(isDialog && "flex flex-wrap items-center gap-3")}>
        <div role="group" aria-labelledby="qty-label" className="inline-flex items-center gap-1 rounded-2xl bg-muted p-1">
          <Button type="button" variant="ghost" size="icon-sm" className="rounded-xl bg-card" onClick={() => stepQty(-1)} aria-label="Weniger">
            <Minus />
          </Button>
          <Input
            value={qtyText}
            onChange={(e) => setQtyText(e.target.value.replace(/[^\d.,]/g, ""))}
            inputMode="decimal"
            aria-label="Menge"
            aria-invalid={qtyInvalid}
            className="h-9 w-[72px] rounded-xl border-[1.5px] border-primary bg-card text-center text-base font-bold md:text-base"
          />
          <Button type="button" size="icon-sm" className="rounded-xl" onClick={() => stepQty(1)} aria-label="Mehr">
            <Plus />
          </Button>
        </div>
        {isDialog ? units : <div className="mt-2.5">{units}</div>}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Info className="size-3.5" />
        Kommazahlen möglich, z. B. 0,5 kg oder 1,5 l
      </p>

      {/* Kategorie */}
      <Label className="mt-4 mb-2 text-[13px] font-semibold">Kategorie</Label>
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

      {error && <p className="mt-4 text-[13px] text-destructive">{error}</p>}

      {/* Aktionen */}
      <div className={cn("mt-6 flex gap-2", isDialog && "items-center")}>
        {onDelete && (
          <Button
            type="button"
            variant="outline"
            onClick={onDelete}
            className={cn(
              "rounded-full border-[1.5px] border-destructive bg-card font-semibold text-destructive hover:bg-destructive/5 hover:text-destructive",
              isDialog ? "h-10 px-5" : "h-12 basis-[38%] text-[15px]",
            )}
          >
            <Trash2 className="size-4" />
            Löschen
          </Button>
        )}
        {isDialog && (
          <Close asChild>
            <Button type="button" variant="outline" className="ml-auto h-10 rounded-full bg-card px-5 font-semibold">
              Abbrechen
            </Button>
          </Close>
        )}
        <Button
          type="submit"
          disabled={saving}
          className={cn("rounded-full font-semibold", isDialog ? "h-10 px-5" : "h-12 flex-1 text-[15px]", isDialog && !onDelete && "")}
        >
          <Check className="size-4" strokeWidth={2.4} />
          {saving ? "Speichert …" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}
