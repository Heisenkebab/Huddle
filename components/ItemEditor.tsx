"use client";

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
import {
  decimalSeparator,
  formatAddedAt,
  formatNumber,
  isQuantityInput,
  isValidQuantity,
  MAX_QUANTITY,
  maxDecimalsForUnit,
  parseNumber,
  quantityAfterUnitChange,
  stepForUnit,
} from "@/lib/format";
import {
  CATEGORIES,
  UNITS,
  type CategoryKey,
  type ShoppingItem,
  type ShoppingItemInput,
  type UnitKey,
} from "@/lib/types";
import { authorOf, ITEM_NAME_MAX_LENGTH } from "@/lib/shopping-list";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { Check, Info, Minus, Plus, Tag, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ComponentType, type ReactNode } from "react";
import PersonAvatar from "./PersonAvatar";

export type EditorTarget =
  { mode: "add" } | { mode: "edit"; item: ShoppingItem };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: EditorTarget;
  onSave: (values: ShoppingItemInput) => Promise<void>;
  onDelete?: () => void;
};

/** Mobile: bottom sheet (drawer). Laptop: centered dialog. */
export default function ItemEditor(props: Props) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  if (isDesktop) {
    return (
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[520px] gap-0 rounded-[28px] border-0 bg-card p-6 shadow-2xl sm:max-w-[520px]"
        >
          <ItemForm
            {...props}
            layout="dialog"
            Title={DialogTitle}
            Description={DialogDescription}
            Close={DialogClose}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={props.open} onOpenChange={props.onOpenChange}>
      <DrawerContent className="mx-auto max-h-[92dvh] max-w-[480px] rounded-t-[28px] border-0 bg-card [&>div:first-child]:mt-2.5 [&>div:first-child]:h-1 [&>div:first-child]:w-10">
        <ItemForm
          {...props}
          layout="sheet"
          Title={DrawerTitle}
          Description={DrawerDescription}
          Close={DrawerClose}
        />
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

function ItemForm({
  target,
  onSave,
  onDelete,
  layout,
  Title,
  Description,
  Close,
}: FormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const item = target.mode === "edit" ? target.item : undefined;
  const isDialog = layout === "dialog";
  const author = item && authorOf(item, t("trip.guest"));

  const [name, setName] = useState(item?.name ?? "");
  const [qtyText, setQtyText] = useState(
    item ? formatNumber(item.quantity, locale) : "1",
  );
  const [unit, setUnit] = useState<UnitKey>(item?.unit ?? "pcs");
  const [category, setCategory] = useState<CategoryKey>(
    item?.category ?? "other",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qty = parseNumber(qtyText);
  const qtyInvalid = !isValidQuantity(qty, unit);

  const stepQty = (dir: 1 | -1) => {
    const step = stepForUnit(unit);
    const next = Math.max(
      step,
      Math.round(((qty ?? 0) + dir * step) * 1000) / 1000,
    );
    setQtyText(formatNumber(next, locale));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError(t("itemEditor.nameRequired"));
    if (qtyInvalid || qty === null)
      return setError(
        t("itemEditor.quantityInvalid", {
          max: MAX_QUANTITY,
          decimals: maxDecimalsForUnit(unit),
        }),
      );
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
          : t("itemEditor.tryAgain");
      setError(t("itemEditor.saveFailed", { message }));
      setSaving(false);
    }
  };

  const units = (
    <ToggleGroup
      type="single"
      spacing={2}
      value={unit}
      onValueChange={(value) => {
        const v = value as UnitKey;
        if (!v || v === unit) return;
        setUnit(v);
        const next = quantityAfterUnitChange(qty, unit, v);
        if (next !== qty && next != null)
          setQtyText(formatNumber(next, locale));
      }}
      aria-label={t("itemEditor.unit")}
      className="flex-wrap"
    >
      {UNITS.map((u) => (
        <ToggleGroupItem key={u} value={u} className={`${chipClass} min-w-9`}>
          {t(`units.${u}`)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  return (
    <form
      onSubmit={submit}
      noValidate
      className={cn(
        !isDialog &&
          "overflow-y-auto px-5 pb-[calc(20px+env(safe-area-inset-bottom))]",
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-3",
          isDialog ? "mb-1" : "pt-3 pb-1",
        )}
      >
        <div className="flex flex-col gap-1 text-left">
          <Title className="text-[19px] leading-tight font-bold">
            {target.mode === "add"
              ? t("itemEditor.addTitle")
              : t("itemEditor.editTitle")}
          </Title>
          {item && author ? (
            <Description className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <PersonAvatar name={author.name} color={author.color} size={14} />
              {t("itemEditor.addedBy", { name: author.name })} ·{" "}
              {formatAddedAt(item.created_at, locale)}
            </Description>
          ) : (
            <Description className="sr-only">
              {t("itemEditor.addDescription")}
            </Description>
          )}
        </div>
        <Close asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full bg-card"
            aria-label={t("itemEditor.close")}
          >
            <X />
          </Button>
        </Close>
      </div>

      <Label
        htmlFor="item-name"
        className="mt-4 mb-2 text-[13px] font-semibold"
      >
        {t("itemEditor.name")}
      </Label>
      <div className="relative">
        <Tag className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
        <Input
          id="item-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("itemEditor.namePlaceholder")}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={ITEM_NAME_MAX_LENGTH}
          autoFocus={target.mode === "add"}
          className="h-11 rounded-2xl bg-card pl-10 text-base md:text-base"
        />
      </div>

      {/* Quantity (+ unit next to it on laptop) */}
      <Label id="qty-label" className="mt-4 mb-2 text-[13px] font-semibold">
        {t("itemEditor.quantity")}
      </Label>
      <div className={cn(isDialog && "flex flex-wrap items-center gap-3")}>
        <div
          role="group"
          aria-labelledby="qty-label"
          className="inline-flex items-center gap-1 rounded-2xl bg-muted p-1"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-xl bg-card"
            onClick={() => stepQty(-1)}
            aria-label={t("itemEditor.less")}
          >
            <Minus />
          </Button>
          <Input
            value={qtyText}
            onChange={(e) => {
              const next = e.target.value
                .replace(/[^\d.,]/g, "")
                .replace(/[.,]/g, decimalSeparator(locale));
              if (isQuantityInput(next, unit)) setQtyText(next);
            }}
            inputMode="decimal"
            aria-label={t("itemEditor.quantity")}
            aria-invalid={qtyInvalid}
            className="h-9 w-[72px] rounded-xl border-[1.5px] border-primary bg-card text-center text-base font-bold md:text-base"
          />
          <Button
            type="button"
            size="icon-sm"
            className="rounded-xl"
            onClick={() => stepQty(1)}
            aria-label={t("itemEditor.more")}
          >
            <Plus />
          </Button>
        </div>
        {isDialog ? units : <div className="mt-2.5">{units}</div>}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Info className="size-3.5" />
        {t("itemEditor.decimalsHint")}
      </p>

      <Label className="mt-4 mb-2 text-[13px] font-semibold">
        {t("itemEditor.category")}
      </Label>
      <ToggleGroup
        type="single"
        spacing={2}
        value={category}
        // A category must always be selected
        onValueChange={(v) => v && setCategory(v as CategoryKey)}
        aria-label={t("itemEditor.category")}
        className="flex-wrap"
      >
        {CATEGORIES.map((c) => (
          <ToggleGroupItem key={c} value={c} className={chipClass}>
            {t(`categories.${c}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {error && <p className="mt-4 text-[13px] text-destructive">{error}</p>}

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
            {t("itemEditor.delete")}
          </Button>
        )}
        {isDialog && (
          <Close asChild>
            <Button
              type="button"
              variant="outline"
              className="ml-auto h-10 rounded-full bg-card px-5 font-semibold"
            >
              {t("itemEditor.cancel")}
            </Button>
          </Close>
        )}
        <Button
          type="submit"
          disabled={saving || !name.trim()}
          className={cn(
            "rounded-full font-semibold",
            isDialog ? "h-10 px-5" : "h-12 flex-1 text-[15px]",
            isDialog && !onDelete && "",
          )}
        >
          <Check className="size-4" strokeWidth={2.4} />
          {saving
            ? t("itemEditor.saving")
            : target.mode === "add"
              ? t("itemEditor.add")
              : t("itemEditor.save")}
        </Button>
      </div>
    </form>
  );
}
