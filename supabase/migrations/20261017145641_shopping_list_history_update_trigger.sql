-- Set by the database, so clients can't claim to be someone else.
-- created_by is fixed on insert and can't be changed afterwards.
CREATE OR REPLACE FUNCTION set_shopping_list_history_authors()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := current_profile_id();
  ELSE
    NEW.created_by := OLD.created_by;
  END IF;
  NEW.updated_by := current_profile_id();
  RETURN NEW;
END;
$$;

CREATE TRIGGER shopping_list_history_authors
  BEFORE INSERT OR UPDATE ON shopping_list_history
  FOR EACH ROW EXECUTE FUNCTION set_shopping_list_history_authors();
