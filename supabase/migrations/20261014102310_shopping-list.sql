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

CREATE TABLE "trip" (
  "id" uuid PRIMARY KEY,
  "invite_id" text UNIQUE,
  "owner_id" uuid
);

CREATE TABLE "profile" (
  "id" uuid PRIMARY KEY,
  "user_id" uuid UNIQUE,
  "name" text,
  "color" int,
  "emoji" text
);

CREATE TABLE "guest_trip" (
  "profile_id" uuid,
  "trip_id" uuid
);

CREATE TABLE "shopping_list_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id" uuid NOT NULL,
  "shopping_list_item_id" uuid NOT NULL,
  "valid_from" timestamptz NOT NULL DEFAULT now(),
  "bought_at" timestamptz,
  "removed_at" timestamptz,
  "unit" "Unit" NOT NULL,
  "amount" numeric NOT NULL
);

-- Only one entry per item and point in time. Column order matches
-- update_shopping_list_item: filter by trip and item, sort by valid_from.
CREATE UNIQUE INDEX "shopping_list_history_trip_item_valid_idx"
  ON "shopping_list_history" ("trip_id", "shopping_list_item_id", "valid_from");

CREATE TABLE "shopping_list_item" (
  "id" uuid PRIMARY KEY,
  "category" "Category",
  "name" text
);

CREATE TABLE "user" (
  "id" uuid PRIMARY KEY NOT NULL,
  "image_url" text
);

CREATE TABLE "bill" (
  "id" uuid PRIMARY KEY,
  "image_url" text,
  "bills" uuid
);

CREATE TABLE "bills" (
  "id" uuid PRIMARY KEY
);

ALTER TABLE "trip" ADD FOREIGN KEY ("owner_id") REFERENCES "profile" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "profile" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "guest_trip" ADD FOREIGN KEY ("profile_id") REFERENCES "profile" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "guest_trip" ADD FOREIGN KEY ("trip_id") REFERENCES "trip" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "shopping_list_history" ADD FOREIGN KEY ("trip_id") REFERENCES "trip" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "shopping_list_history" ADD FOREIGN KEY ("shopping_list_item_id") REFERENCES "shopping_list_item" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "bill" ADD FOREIGN KEY ("bills") REFERENCES "bills" ("id") DEFERRABLE INITIALLY IMMEDIATE;
