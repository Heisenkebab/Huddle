CREATE TYPE "Category" AS ENUM (
  'FOOD',
  'DRINK',
  'DAIRY',
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
  "color" int NOT NULL,
  "emoji" text,
  "image_url" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "trip" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "owner_id" uuid NOT NULL REFERENCES "profile" ("id")
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

CREATE TABLE "shopping_list_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "shopping_list_item_id" uuid NOT NULL REFERENCES "shopping_list_item" ("id"),
  "bought_at" timestamptz,
  "removed_at" timestamptz,
  "unit" "Unit" NOT NULL,
  "amount" numeric NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- At most one open (not bought, not removed) entry per item
CREATE UNIQUE INDEX "shopping_list_history_one_open_idx"
  ON "shopping_list_history" ("shopping_list_item_id")
  WHERE "bought_at" IS NULL AND "removed_at" IS NULL;

CREATE TABLE "bills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid()
);

CREATE TABLE "bill" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "image_url" text,
  "bills" uuid REFERENCES "bills" ("id")
);
