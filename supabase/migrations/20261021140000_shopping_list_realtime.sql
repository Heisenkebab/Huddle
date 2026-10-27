-- Lets the shopping list page refetch when another member changes the list.
-- Realtime checks RLS per subscriber, so members only hear about their trips.
ALTER PUBLICATION supabase_realtime
  ADD TABLE shopping_list_item, shopping_list_history;
