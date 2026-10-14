CREATE TYPE "Category" AS ENUM (
  'FOOOD',
  'DRINK',
  'DIARY',
  'OTHER'
);

CREATE TYPE "Unit" AS ENUM (
  'KILO_GRAMM',
  'GRAMM',
  'LITER',
  'AMOUNT'
);

CREATE TABLE "trip" (
  "id" uuid PRIMARY KEY,
  "invite_link" "String" UNIQUE,
  "owner_id" uuid
);

CREATE TABLE "profile" (
  "user_id" uuid,
  "id" uuid,
  "name" "String",
  "color" int,
  "emoji" "String",
  PRIMARY KEY ("user_id", "id")
);

CREATE TABLE "guest_trip" (
  "profile_id" uuid,
  "trip_id" uuid
);

CREATE TABLE "grocery_list_history" (
  "trip_id" uuid,
  "valid_from" datetime,
  "grocery_list_item_id" uuid,
  "bought_at" datetime,
  "removed_at" datetime,
  "unit" "Unit",
  "amount" Decimal,
  PRIMARY KEY ("trip_id", "valid_from", "grocery_list_item_id")
);

CREATE TABLE "grocery_list_item" (
  "id" uuid PRIMARY KEY,
  "category" "Category",
  "name" "String"
);

ALTER TABLE "trip" ADD FOREIGN KEY ("owner_id") REFERENCES "profile" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "profile" ADD FOREIGN KEY ("user_id") REFERENCES "user" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "guest_trip" ADD FOREIGN KEY ("profile_id") REFERENCES "profile" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "guest_trip" ADD FOREIGN KEY ("trip_id") REFERENCES "trip" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "grocery_list_history" ADD FOREIGN KEY ("trip_id") REFERENCES "trip" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "grocery_list_history" ADD FOREIGN KEY ("grocery_list_item_id") REFERENCES "grocery_list_item" ("id") DEFERRABLE INITIALLY IMMEDIATE;
