-- Demo-Daten wie im Entwurf "Mobile / 2a · Einkauf"
-- Only runs locally (`supabase start` on a new DB, `supabase db reset`)

-- Supabase Auth accounts. Sign in with e.g. sara@huddle.test / password123
create temporary table demo_user (id uuid, email text);
insert into demo_user (id, email) values
  ('c0000000-0000-4000-8000-000000000001', 'sara@huddle.test'),
  ('c0000000-0000-4000-8000-000000000002', 'mia@huddle.test'),
  ('c0000000-0000-4000-8000-000000000003', 'tom@huddle.test'),
  ('c0000000-0000-4000-8000-000000000004', 'lena@huddle.test'),
  ('c0000000-0000-4000-8000-000000000005', 'jonas@huddle.test');

-- Auth expects the token columns to be '' instead of NULL, or sign-in fails
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
  '', '', '', ''
from demo_user;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  now(), now(), now()
from demo_user;

insert into public.profile (id, user_id, name, color) values
  ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Sara',  '#E0A526'),
  ('a0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'Mia',   '#B65FB8'),
  ('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'Tom',   '#1E7461'),
  ('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 'Lena',  '#EF6B4A'),
  ('a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000005', 'Jonas', '#5B7BD5');

insert into public.trip (id, owner_id, name, start_date, end_date) values
  ('7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'a0000000-0000-4000-8000-000000000001',
   'Gardasee', now() - interval '2 days', now() + interval '5 days');

insert into public.trip_invite (trip_id, invite_id) values
  ('7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'd0000000-0000-4000-8000-000000000001');

insert into public.guest_trip (profile_id, trip_id) values
  ('a0000000-0000-4000-8000-000000000002', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17'),
  ('a0000000-0000-4000-8000-000000000003', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17'),
  ('a0000000-0000-4000-8000-000000000004', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17'),
  ('a0000000-0000-4000-8000-000000000005', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17');

insert into public.shopping_list_item (id, trip_id, name, category) values
  ('b0000000-0000-4000-8000-000000000001', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Milch',      'CHILLED'),
  ('b0000000-0000-4000-8000-000000000002', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Joghurt',    'CHILLED'),
  ('b0000000-0000-4000-8000-000000000003', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Baguette',   'BAKERY'),
  ('b0000000-0000-4000-8000-000000000004', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Grillkohle', 'OTHER'),
  ('b0000000-0000-4000-8000-000000000005', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Bier',       'DRINKS');

insert into public.shopping_list_history (shopping_list_item_id, created_at, unit, amount, bought_at) values
  ('b0000000-0000-4000-8000-000000000001', now() - interval '50 minutes', 'LITER',  2, null),
  ('b0000000-0000-4000-8000-000000000002', now() - interval '40 minutes', 'AMOUNT', 4, null),
  ('b0000000-0000-4000-8000-000000000003', now() - interval '90 minutes', 'AMOUNT', 4, now() - interval '60 minutes'),
  ('b0000000-0000-4000-8000-000000000003', now() - interval '30 minutes', 'AMOUNT', 4, null),
  ('b0000000-0000-4000-8000-000000000004', now() - interval '20 minutes', 'AMOUNT', 1, null),
  ('b0000000-0000-4000-8000-000000000005', now() - interval '10 minutes', 'AMOUNT', 2, null);

-- Edge cases for "newest entry per item". Expected result for Gardasee:
--   Milch, Joghurt, Grillkohle, Bier  open (one entry each)
--   Baguette    open    (bought earlier, then added again)
--   Tomaten     bought  (only entry is bought)
--   Würstchen   bought  (bought twice; only the newer entry, 500 g)
--   Ketchup     open    (removed earlier, then added again)
--   Chips       gone    (only entry is removed)
--   Käse        gone    (bought earlier, added again, then removed)
--   Sonnencreme gone    (belongs to another trip)
insert into public.trip (id, owner_id, name, start_date, end_date) values
  ('7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a18', 'a0000000-0000-4000-8000-000000000003',
   'Wien', now() + interval '20 days', now() + interval '23 days');

insert into public.shopping_list_item (id, trip_id, name, category) values
  ('b0000000-0000-4000-8000-000000000006', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Tomaten',     'PRODUCE'),
  ('b0000000-0000-4000-8000-000000000007', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Würstchen',   'MEAT'),
  ('b0000000-0000-4000-8000-000000000008', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Ketchup',     'PANTRY'),
  ('b0000000-0000-4000-8000-000000000009', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Chips',       'SNACKS'),
  ('b0000000-0000-4000-8000-000000000010', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a17', 'Käse',        'CHILLED'),
  ('b0000000-0000-4000-8000-000000000011', '7c1f3a52-9d4e-4b8a-a6f1-2e5d8c0b4a18', 'Sonnencreme', 'TOILETRIES');

insert into public.shopping_list_history (shopping_list_item_id, created_at, unit, amount, bought_at, removed_at) values
  -- Tomaten: bought
  ('b0000000-0000-4000-8000-000000000006', now() - interval '3 hours',   'KILOGRAM', 0.5, now() - interval '2 hours',   null),
  -- Würstchen: bought, then added again and bought again
  ('b0000000-0000-4000-8000-000000000007', now() - interval '2 days',    'AMOUNT',   8,   now() - interval '2 days',    null),
  ('b0000000-0000-4000-8000-000000000007', now() - interval '1 day',     'GRAM',     500, now() - interval '20 hours',  null),
  -- Ketchup: removed, then added again
  ('b0000000-0000-4000-8000-000000000008', now() - interval '5 hours',   'AMOUNT',   1,   null,                         now() - interval '4 hours'),
  ('b0000000-0000-4000-8000-000000000008', now() - interval '15 minutes', 'AMOUNT',  2,   null,                         null),
  -- Chips: removed
  ('b0000000-0000-4000-8000-000000000009', now() - interval '2 hours',   'AMOUNT',   3,   null,                         now() - interval '1 hour'),
  -- Käse: bought, added again, then removed
  ('b0000000-0000-4000-8000-000000000010', now() - interval '1 day',     'GRAM',     200, now() - interval '1 day',     null),
  ('b0000000-0000-4000-8000-000000000010', now() - interval '1 hour',    'GRAM',     300, null,                         now() - interval '30 minutes'),
  -- Sonnencreme: open, but in trip Wien
  ('b0000000-0000-4000-8000-000000000011', now() - interval '1 hour',    'AMOUNT',   1,   null,                         null);
