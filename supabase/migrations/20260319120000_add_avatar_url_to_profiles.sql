-- Add avatar_url to profiles so user profile photos can be stored in the DB
alter table public.profiles
  add column if not exists avatar_url text;
