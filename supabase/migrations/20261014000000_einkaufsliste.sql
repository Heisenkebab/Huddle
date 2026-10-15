-- Huddle · Einkaufsliste (Initial-Setup)

create table if not exists public.trips (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.shopping_items (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.trips (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 80),
  quantity        numeric(12, 3) check (quantity is null or quantity > 0),
  unit            text,
  category        text,
  description     text,            -- für später (Detail-Popup), aktuell nicht im UI
  purchased       boolean not null default false,
  added_by_name   text not null,
  added_by_color  text not null default '#E0A526',
  created_at      timestamptz not null default now()
);

create index if not exists shopping_items_trip_id_idx on public.shopping_items (trip_id);

-- Echtzeit für die Liste aktivieren
alter publication supabase_realtime add table public.shopping_items;

-- ACHTUNG Initial-Setup: Mitreisende haben kein Konto, daher offener anon-Zugriff.
-- Vor dem Praxistest auf Zugriff per Reise-Link/Token einschränken.
alter table public.trips enable row level security;
alter table public.shopping_items enable row level security;

create policy "trips_read_initial" on public.trips
  for select to anon, authenticated using (true);

create policy "shopping_items_all_initial" on public.shopping_items
  for all to anon, authenticated using (true) with check (true);
