CREATE TYPE "Category" AS ENUM (
  'PRODUCE',
  'CHILLED',
  'BAKERY',
  'DRINKS',
  'BBQ',
  'OTHER'
);

CREATE TYPE "Unit" AS ENUM (
  'KILOGRAM',
  'GRAM',
  'LITER',
  'MILLILITER',
  'AMOUNT'
);

CREATE TABLE "profile" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Supabase Auth account; the profile is deleted together with it
  "user_id" uuid NOT NULL UNIQUE REFERENCES auth.users ("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  -- Hex color like '#E0A526'
  "color" text NOT NULL,
  "emoji" text,
  "image_url" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "trip" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" uuid NOT NULL REFERENCES "profile" ("id"),
  "name" text NOT NULL,
  "start_date" timestamptz NOT NULL,
  "end_date" timestamptz NOT NULL
);

CREATE TABLE "trip_invite" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id" uuid NOT NULL REFERENCES "trip" ("id"),
  "invite_id" uuid NOT NULL UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "ending_at" timestamptz NOT NULL DEFAULT now() + interval '7 day'
);

CREATE TABLE "guest_trip" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" uuid NOT NULL REFERENCES "profile" ("id"),
  "trip_id" uuid NOT NULL REFERENCES "trip" ("id"),
  UNIQUE ("profile_id", "trip_id")
);

CREATE TABLE "shopping_list_item" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "category" "Category" NOT NULL,
  "name" text NOT NULL,
  "trip_id" uuid NOT NULL REFERENCES "trip" ("id"),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- "Milch" and " milch " count as the same item within a trip
CREATE UNIQUE INDEX "shopping_list_item_trip_name_idx"
  ON "shopping_list_item" ("trip_id", lower(trim("name")));

-- Amounts must be positive. Grams, milliliters and pieces are whole numbers;
-- kilograms and liters have at most 3 decimals, so converting them into grams
-- or milliliters always gives a whole number.
CREATE OR REPLACE FUNCTION is_valid_amount(p_unit "Unit", p_amount numeric)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_amount > 0
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
    CHECK (is_valid_amount("unit", "amount")),
  -- A bought entry can't be removed, and a removed entry can't be bought
  CONSTRAINT "shopping_list_history_bought_or_removed_check"
    CHECK ("bought_at" IS NULL OR "removed_at" IS NULL)
);

-- At most one open (not bought, not removed) entry per item
CREATE UNIQUE INDEX "shopping_list_history_one_open_idx"
  ON "shopping_list_history" ("shopping_list_item_id")
  WHERE "bought_at" IS NULL AND "removed_at" IS NULL;
