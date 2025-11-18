-- Create enum for user roles
create type public.app_role as enum ('admin', 'user');

-- Create enum for subscription tiers
create type public.subscription_tier as enum ('free', 'daily', 'business');

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create user_roles table (separate from profiles for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'user',
  unique (user_id, role)
);

-- Create subscriptions table
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  tier subscription_tier not null default 'free',
  conversions_used int not null default 0,
  conversions_limit int not null default 1,
  billing_cycle_start timestamptz not null default now(),
  billing_cycle_end timestamptz not null default (now() + interval '1 week'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create conversions table
create table public.conversions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  original_filename text not null,
  file_path text not null,
  status text not null default 'processing',
  result_path text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.conversions enable row level security;

-- Create security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS Policies for profiles
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- RLS Policies for user_roles
create policy "Users can view their own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

-- RLS Policies for subscriptions
create policy "Users can view their own subscription"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update their own subscription"
  on public.subscriptions for update
  to authenticated
  using (auth.uid() = user_id);

-- RLS Policies for conversions
create policy "Users can view their own conversions"
  on public.conversions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own conversions"
  on public.conversions for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Create trigger function for updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Add triggers for updated_at
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger set_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

-- Create trigger to create profile and subscription on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  insert into public.subscriptions (user_id, tier, conversions_limit)
  values (new.id, 'free', 1);
  
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create storage bucket for bank statements
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bank-statements',
  'bank-statements',
  false,
  10485760, -- 10MB limit
  array['application/pdf', 'image/png', 'image/jpeg']
);

-- Storage RLS policies
create policy "Users can upload their own files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'bank-statements' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read their own files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'bank-statements' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'bank-statements' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );