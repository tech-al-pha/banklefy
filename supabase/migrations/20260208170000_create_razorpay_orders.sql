-- Create a table to store Razorpay order metadata for billing analytics
create table if not exists public.razorpay_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  plan_id text not null,
  razorpay_order_id text not null unique,
  receipt text not null,
  amount integer not null,
  currency text not null default 'INR',
  status text not null,
  payment_capture boolean not null default true,
  notes jsonb,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists razorpay_orders_user_id_idx on public.razorpay_orders (user_id);
