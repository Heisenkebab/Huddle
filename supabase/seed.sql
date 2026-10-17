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

insert into public.shopping_list_history (shopping_list_item_id, created_at, unit, amount) values
  ('b0000000-0000-4000-8000-000000000001', now() - interval '50 minutes', 'LITER',  2),
  ('b0000000-0000-4000-8000-000000000002', now() - interval '40 minutes', 'AMOUNT', 4),
  ('b0000000-0000-4000-8000-000000000003', now() - interval '30 minutes', 'AMOUNT', 4),
  ('b0000000-0000-4000-8000-000000000004', now() - interval '20 minutes', 'AMOUNT', 1),
  ('b0000000-0000-4000-8000-000000000005', now() - interval '10 minutes', 'AMOUNT', 2);
