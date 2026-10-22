-- Users can update their own profile directly through PostgREST, so the
-- database has to validate it. color ends up in a CSS style attribute, where
-- a value like url(...) would make every trip mate's browser load that URL.
ALTER TABLE profile
  ADD CONSTRAINT profile_color_hex CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT profile_name_length CHECK (char_length(trim(name)) BETWEEN 1 AND 50);
