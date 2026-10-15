-- Demo-Daten wie im Entwurf "Mobile / 2a · Einkauf"
insert into public.trips (id, name, start_date, end_date)
values ('7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Wochenende am Attersee', '2027-06-12', '2027-06-14')
on conflict (id) do update set start_date = excluded.start_date, end_date = excluded.end_date;

insert into public.shopping_items (trip_id, name, quantity, unit, category, added_by_name, added_by_color, created_at) values
  ('7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Milch',      2, 'l',      'Kühlregal', 'Sara',  '#E0A526', now() - interval '50 minutes'),
  ('7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Joghurt',    4, 'Becher', 'Kühlregal', 'Mia',   '#B65FB8', now() - interval '40 minutes'),
  ('7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Baguette',   4, 'Stück',  'Backwaren', 'Tom',   '#1E7461', now() - interval '30 minutes'),
  ('7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Grillkohle', 1, 'Sack',   'Grillen',   'Lena',  '#EF6B4A', now() - interval '20 minutes'),
  ('7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Bier',       2, 'Kisten', 'Getränke',  'Jonas', '#5B7BD5', now() - interval '10 minutes');
