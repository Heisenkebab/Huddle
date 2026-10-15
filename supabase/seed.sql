-- Demo-Daten wie im Entwurf "Mobile / 2a · Einkauf"
-- Only runs locally (`supabase start` on a new DB, `supabase db reset`)

insert into public.user (id) values
  ('c0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-000000000003'),
  ('c0000000-0000-4000-8000-000000000004'),
  ('c0000000-0000-4000-8000-000000000005');

insert into public.profile (id, user_id, name, color) values
  ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Sara',  x'E0A526'::int),
  ('a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'Mia',   x'B65FB8'::int),
  ('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'Tom',   x'1E7461'::int),
  ('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 'Lena',  x'EF6B4A'::int),
  ('a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000005', 'Jonas', x'5B7BD5'::int);

insert into public.trip (id, owner_id) values
  ('7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'a0000000-0000-4000-8000-000000000001');

insert into public.trip_invite (trip_id, invite_id) values
  ('7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'd0000000-0000-4000-8000-000000000001');

insert into public.guest_trip (profile_id, trip_id) values
  ('a0000000-0000-4000-8000-000000000002', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17'),
  ('a0000000-0000-4000-8000-000000000003', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17'),
  ('a0000000-0000-4000-8000-000000000004', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17'),
  ('a0000000-0000-4000-8000-000000000005', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17');

insert into public.shopping_list_item (id, trip_id, name, category) values
  ('b0000000-0000-4000-8000-000000000001', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Milch',      'DAIRY'),
  ('b0000000-0000-4000-8000-000000000002', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Joghurt',    'DAIRY'),
  ('b0000000-0000-4000-8000-000000000003', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Baguette',   'FOOD'),
  ('b0000000-0000-4000-8000-000000000004', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Grillkohle', 'OTHER'),
  ('b0000000-0000-4000-8000-000000000005', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Bier',       'DRINK');

insert into public.shopping_list_history (shopping_list_item_id, created_at, unit, amount) values
  ('b0000000-0000-4000-8000-000000000001', now() - interval '50 minutes', 'LITER',  2),
  ('b0000000-0000-4000-8000-000000000002', now() - interval '40 minutes', 'AMOUNT', 4),
  ('b0000000-0000-4000-8000-000000000003', now() - interval '30 minutes', 'AMOUNT', 4),
  ('b0000000-0000-4000-8000-000000000004', now() - interval '20 minutes', 'AMOUNT', 1),
  ('b0000000-0000-4000-8000-000000000005', now() - interval '10 minutes', 'AMOUNT', 2);
