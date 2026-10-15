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
  "trip_id" uuid,
  "valid_from" timestamptz,
  "shopping_list_item_id" uuid,
  "bought_at" timestamptz,
  "removed_at" timestamptz,
  "unit" "Unit",
  "amount" numeric,
  PRIMARY KEY ("trip_id", "valid_from", "shopping_list_item_id")
);

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
