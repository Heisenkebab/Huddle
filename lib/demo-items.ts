import type { ShoppingItem } from "@/lib/types";

// Startliste für den Vorschaumodus (Sprint-Review), bis die Seite an die echte DB angebunden ist
const DEMO: Omit<ShoppingItem, "id" | "trip_id" | "created_at">[] = [
  {
    name: "Tomaten",
    quantity: 6,
    unit: "pcs",
    category: "produce",
    description: null,
    purchased: false,
    added_by_name: "Mia",
    added_by_color: "#B65FB8",
  },
  {
    name: "Bananen",
    quantity: 1,
    unit: "kg",
    category: "produce",
    description: null,
    purchased: true,
    added_by_name: "Lena",
    added_by_color: "#EF6B4A",
  },
  {
    name: "Milch",
    quantity: 2,
    unit: "l",
    category: "chilled",
    description: null,
    purchased: false,
    added_by_name: "Sara",
    added_by_color: "#E0A526",
  },
  {
    name: "Joghurt",
    quantity: 4,
    unit: "pcs",
    category: "chilled",
    description: null,
    purchased: false,
    added_by_name: "Mia",
    added_by_color: "#B65FB8",
  },
  {
    name: "Baguette",
    quantity: 4,
    unit: "pcs",
    category: "bakery",
    description: null,
    purchased: false,
    added_by_name: "Tom",
    added_by_color: "#1E7461",
  },
  {
    name: "Grillkohle",
    quantity: 1,
    unit: "pcs",
    category: "bbq",
    description: null,
    purchased: false,
    added_by_name: "Jonas",
    added_by_color: "#5B7BD5",
  },
  {
    name: "Bier",
    quantity: 2,
    unit: "pcs",
    category: "drinks",
    description: null,
    purchased: false,
    added_by_name: "Tom",
    added_by_color: "#1E7461",
  },
];

export function demoItems(tripId: string): ShoppingItem[] {
  const now = Date.now();
  return DEMO.map((item, i) => ({
    ...item,
    id: `demo-${i}`,
    trip_id: tripId,
    // Abstand von einer Minute, damit die Reihenfolge stabil bleibt
    created_at: new Date(now - (DEMO.length - i) * 60_000).toISOString(),
  }));
}
