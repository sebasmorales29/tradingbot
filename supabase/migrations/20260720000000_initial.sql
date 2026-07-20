-- PulseTrade initial schema
-- Run in Supabase SQL Editor or via supabase CLI

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Waitlist (public insert)
-- ---------------------------------------------------------------------------
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  constraint waitlist_email_unique unique (email)
);

alter table public.waitlist enable row level security;

create policy "waitlist_insert_anyone"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

-- ---------------------------------------------------------------------------
-- Bot config
-- ---------------------------------------------------------------------------
create table if not exists public.bot_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null default 'paper' check (mode in ('paper', 'live')),
  is_active boolean not null default false,
  risk_percent numeric(5, 2) not null default 0.75,
  pairs text[] not null default array['BTC/USDT', 'ETH/USDT'],
  kill_switch boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bot_configs_user_unique unique (user_id)
);

alter table public.bot_configs enable row level security;

create policy "bot_configs_all_own"
  on public.bot_configs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auth signup hook (after bot_configs exists)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  insert into public.bot_configs (user_id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Exchange credentials (store ciphertext only)
-- ---------------------------------------------------------------------------
create table if not exists public.exchange_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exchange text not null default 'binance',
  api_key_encrypted text not null,
  api_secret_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exchange_credentials_user_unique unique (user_id)
);

alter table public.exchange_credentials enable row level security;

create policy "exchange_credentials_all_own"
  on public.exchange_credentials for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Signals
-- ---------------------------------------------------------------------------
create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pair text not null,
  side text not null check (side in ('long', 'flat')),
  reason text,
  price numeric,
  created_at timestamptz not null default now()
);

create index if not exists signals_user_created_idx
  on public.signals (user_id, created_at desc);

alter table public.signals enable row level security;

create policy "signals_all_own"
  on public.signals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Trades
-- ---------------------------------------------------------------------------
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pair text not null,
  side text not null check (side in ('buy', 'sell')),
  qty numeric not null,
  entry_price numeric not null,
  exit_price numeric,
  pnl numeric,
  mode text not null default 'paper' check (mode in ('paper', 'live')),
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists trades_user_opened_idx
  on public.trades (user_id, opened_at desc);

alter table public.trades enable row level security;

create policy "trades_all_own"
  on public.trades for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Equity snapshots
-- ---------------------------------------------------------------------------
create table if not exists public.equity_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  equity numeric not null,
  mode text not null default 'paper' check (mode in ('paper', 'live')),
  recorded_at timestamptz not null default now()
);

create index if not exists equity_snapshots_user_recorded_idx
  on public.equity_snapshots (user_id, recorded_at desc);

alter table public.equity_snapshots enable row level security;

create policy "equity_snapshots_all_own"
  on public.equity_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
