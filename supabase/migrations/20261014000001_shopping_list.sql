CREATE TYPE "Category" AS ENUM (
  'PRODUCE',
  'CHILLED',
  'FROZEN',
  'BAKERY',
  'PANTRY',
  'SNACKS',
  'MEAT',
  'DRINKS',
  'ALCOHOL',
  'HOUSEHOLD',
  'TOILETRIES',
  'OTHER'
);

CREATE TYPE "Unit" AS ENUM (
  'KILOGRAM',
  'GRAM',
  'LITER',
  'MILLILITER',
  'AMOUNT'
);

CREATE TABLE "shopping_list_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "category" "Category" NOT NULL,
  "name" text NOT NULL,
  "trip_id" uuid NOT NULL REFERENCES "trip" ("id"),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  -- Same limit as ITEM_NAME_MAX_LENGTH in lib/shopping-list.ts
  CONSTRAINT "shopping_list_item_name_length"
    CHECK (char_length(trim("name")) BETWEEN 1 AND 80)
);

-- "Milch" and " milch " count as the same item within a trip
CREATE UNIQUE INDEX "shopping_list_item_trip_name_idx"
  ON "shopping_list_item" ("trip_id", lower(trim("name")));

-- Amounts must be positive. Grams, milliliters and pieces are whole numbers;
-- kilograms and liters have at most 3 decimals, so converting them into grams
-- or milliliters always gives a whole number. At most 10000 (MAX_QUANTITY).
CREATE OR REPLACE FUNCTION public.is_valid_amount(p_unit public."Unit", p_amount numeric)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_amount > 0
    AND p_amount <= 10000
    AND p_amount = round(p_amount, 3)
    AND (p_unit NOT IN ('GRAM', 'MILLILITER', 'AMOUNT')
         OR p_amount = trunc(p_amount));
$$;

CREATE TABLE "shopping_list_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "shopping_list_item_id" uuid NOT NULL REFERENCES "shopping_list_item" ("id"),
  "bought_at" timestamptz,
  "removed_at" timestamptz,
  "unit" "Unit" NOT NULL,
  "amount" numeric NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  -- Who added the entry and who wrote it last (changed amount/unit, bought or
  -- removed it). Set by a trigger; NULL for rows written without a signed-in
  -- user (seed, service role) or when that profile was deleted.
  "updated_by" uuid REFERENCES "profile" ("id") ON DELETE SET NULL,
  "created_by" uuid REFERENCES "profile" ("id") ON DELETE SET NULL,
  CONSTRAINT "shopping_list_history_amount_check"
    CHECK (public.is_valid_amount("unit", "amount")),
  -- A bought entry can't be removed, and a removed entry can't be bought
  CONSTRAINT "shopping_list_history_bought_or_removed_check"
    CHECK ("bought_at" IS NULL OR "removed_at" IS NULL)
);

-- At most one open (not bought, not removed) entry per item
CREATE UNIQUE INDEX "shopping_list_history_one_open_idx"
  ON "shopping_list_history" ("shopping_list_item_id")
  WHERE "bought_at" IS NULL AND "removed_at" IS NULL;

-- Which group a unit belongs to. Amounts of units in the same group can be
-- added together after converting them with unit_factor.
CREATE OR REPLACE FUNCTION public.unit_group(p_unit public."Unit")
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_unit
    WHEN 'KILOGRAM' THEN 'mass'
    WHEN 'GRAM' THEN 'mass'
    WHEN 'LITER' THEN 'volume'
    WHEN 'MILLILITER' THEN 'volume'
    ELSE 'amount'
  END;
$$;

-- How many base units (g, ml, pieces) one of the unit is
CREATE OR REPLACE FUNCTION public.unit_factor(p_unit public."Unit")
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_unit
    WHEN 'KILOGRAM' THEN 1000
    WHEN 'LITER' THEN 1000
    ELSE 1
  END;
$$;

-- shopping_list_item / shopping_list_history -------------------------------
-- Read-only: all writes go through the RPCs, which validate the input
ALTER TABLE public.shopping_list_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read the trip's items"
  ON public.shopping_list_item FOR SELECT TO authenticated
  USING (public.is_trip_member(trip_id));

ALTER TABLE public.shopping_list_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read the trip's item history"
  ON public.shopping_list_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_list_item i
      WHERE i.id = shopping_list_item_id
        AND public.is_trip_member(i.trip_id)
    )
  );

-- Stays blocked even if a write policy is added by mistake
REVOKE INSERT, UPDATE, DELETE
  ON public.shopping_list_item, public.shopping_list_history
  FROM anon, authenticated;

-- Lets the shopping list page refetch when another member changes the list.
-- Realtime checks RLS per subscriber, so members only hear about their trips.
ALTER PUBLICATION supabase_realtime
  ADD TABLE shopping_list_item, shopping_list_history;
