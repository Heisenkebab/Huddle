-- Gives every history entry its own id instead of the composite primary key.
-- Existing rows get a generated id when the column is added.
ALTER TABLE "shopping_list_history"
  ADD COLUMN "id" uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE "shopping_list_history"
  DROP CONSTRAINT "shopping_list_history_pkey";

ALTER TABLE "shopping_list_history"
  ADD PRIMARY KEY ("id");

ALTER TABLE "shopping_list_history"
  ALTER COLUMN "trip_id" SET NOT NULL,
  ALTER COLUMN "shopping_list_item_id" SET NOT NULL,
  ALTER COLUMN "valid_from" SET NOT NULL,
  ALTER COLUMN "valid_from" SET DEFAULT now(),
  ALTER COLUMN "unit" SET NOT NULL,
  ALTER COLUMN "amount" SET NOT NULL;

-- Still only one entry per item and point in time. Column order matches
-- update_shopping_list_item: filter by trip and item, sort by valid_from.
CREATE UNIQUE INDEX "shopping_list_history_trip_item_valid_idx"
  ON "shopping_list_history" ("trip_id", "shopping_list_item_id", "valid_from");
