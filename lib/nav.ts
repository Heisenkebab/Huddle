import {
  ArrowLeftRight,
  LayoutGrid,
  ListChecks,
  Receipt,
  ShoppingCart,
} from "lucide-react";

export const NAV_ITEMS = [
  { section: "shopping-list", label: "Einkauf", Icon: ShoppingCart },
  { section: "tasks", label: "Aufgaben", Icon: ListChecks },
  { section: "board", label: "Board", Icon: LayoutGrid },
  { section: "expenses", label: "Ausgaben", Icon: Receipt },
  { section: "invoice", label: "Abrechnung", Icon: ArrowLeftRight },
];
