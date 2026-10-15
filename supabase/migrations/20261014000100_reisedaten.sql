-- Reisezeitraum für die Sidebar ("12.–14. Juni · 6 Personen")
alter table public.trips add column if not exists start_date date;
alter table public.trips add column if not exists end_date   date;
