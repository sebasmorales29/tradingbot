-- Sesiones paper del sandbox admin: sobreviven refresh / navegación / ticks en cron.
create table if not exists public.sandbox_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  session_id text not null,
  is_active boolean not null default true,
  live_on boolean not null default true,
  tick_interval_ms integer not null default 20000
    check (tick_interval_ms >= 5000 and tick_interval_ms <= 300000),
  state jsonb not null,
  market jsonb,
  candles jsonb,
  last_tick_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sandbox_sessions_active_idx
  on public.sandbox_sessions (is_active, live_on, last_tick_at)
  where is_active = true;

alter table public.sandbox_sessions enable row level security;
-- Solo service role / server (sin policies públicas)
