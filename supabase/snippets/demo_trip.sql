-- Demo trip for testing the join flow on a real (e.g. prod) database.
-- Run it by hand in the Supabase SQL editor (as postgres, so RLS doesn't apply).
-- It is NOT run automatically like seed.sql.
--
-- Join link: <site-url>/invite/3bbcf208-0463-42da-9ce1-d5632316e301
--
-- Safe to run more than once: fixed ids + ON CONFLICT. Running it again also
-- extends the invite, so it works as a "refresh the link" too.
--
-- The owner account has no usable password (random hash), so nobody can sign
-- in as it. To use it, set a password in Dashboard -> Authentication -> Users.
-- Cleanup is at the bottom of this file.

begin;

-- Owner auth account. Auth expects the token columns to be '' instead of NULL
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '590bf279-df9f-4972-a66e-17a39b19eba8',
  'authenticated', 'authenticated', 'demo-owner@huddle.test',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
  '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  '590bf279-df9f-4972-a66e-17a39b19eba8',
  '590bf279-df9f-4972-a66e-17a39b19eba8', 'email',
  jsonb_build_object(
    'sub', '590bf279-df9f-4972-a66e-17a39b19eba8',
    'email', 'demo-owner@huddle.test',
    'email_verified', true
  ),
  now(), now(), now()
)
on conflict (provider_id, provider) do nothing;

insert into public.profile (id, user_id, name, color) values (
  '32145754-7929-4c7d-b7f9-b591c4f6bbc3',
  '590bf279-df9f-4972-a66e-17a39b19eba8',
  'Demo Owner', '#1E7461'
)
on conflict (id) do nothing;

insert into public.trip (id, owner_id, name, start_date, end_date) values (
  '23275316-9d52-4d71-8617-95691384157d',
  '32145754-7929-4c7d-b7f9-b591c4f6bbc3',
  'Demo Trip', current_date, current_date + 7
)
on conflict (id) do nothing;

-- Fixed invite_id so the link stays the same. Each run pushes the expiry out
-- again (the default would be 7 days).
insert into public.trip_invite (trip_id, invite_id, ending_at) values (
  '23275316-9d52-4d71-8617-95691384157d',
  '3bbcf208-0463-42da-9ce1-d5632316e301',
  now() + interval '30 days'
)
on conflict (invite_id) do update set ending_at = excluded.ending_at;

commit;

-- Cleanup: removes the demo trip, its guests, the invite and the owner.
-- Uncomment and run on its own.
--
-- begin;
-- delete from public.shopping_list_history
--   where shopping_list_item_id in (
--     select id from public.shopping_list_item
--     where trip_id = '23275316-9d52-4d71-8617-95691384157d'
--   );
-- delete from public.shopping_list_item where trip_id = '23275316-9d52-4d71-8617-95691384157d';
-- delete from public.trip_invite        where trip_id = '23275316-9d52-4d71-8617-95691384157d';
-- delete from public.guest_trip         where trip_id = '23275316-9d52-4d71-8617-95691384157d';
-- delete from public.trip               where id      = '23275316-9d52-4d71-8617-95691384157d';
-- delete from auth.users                where id      = '590bf279-df9f-4972-a66e-17a39b19eba8'; -- cascades to profile
-- commit;
