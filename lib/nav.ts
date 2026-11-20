import {
  ArrowLeftRight,
  LayoutGrid,
  ListChecks,
  Receipt,
  ShoppingCart,
} from "lucide-react";

export const NAV_ITEMS = [
  { section: "shopping-list", Icon: ShoppingCart },
  { section: "tasks", Icon: ListChecks },
  { section: "board", Icon: LayoutGrid },
  { section: "expenses", Icon: Receipt },
  { section: "invoice", Icon: ArrowLeftRight },
] as const;
