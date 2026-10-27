-- Set by the database, so clients can't claim to be someone else.
-- created_by is fixed on insert and can't be changed afterwards.
-- updated_at is set on every write, so functions don't have to set it.
-- Own search_path, as it fires inside the RPCs with their empty one
CREATE OR REPLACE FUNCTION public.set_shopping_list_history_authors()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := public.current_profile_id();
  ELSE
    NEW.created_by := OLD.created_by;
  END IF;
  NEW.updated_by := public.current_profile_id();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER shopping_list_history_authors
  BEFORE INSERT OR UPDATE ON public.shopping_list_history
  FOR EACH ROW EXECUTE FUNCTION public.set_shopping_list_history_authors();
