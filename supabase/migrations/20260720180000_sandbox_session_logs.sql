-- Historial de sesiones paper del sandbox (para Logs + export PDF).
create table if not exists public.sandbox_session_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id text not null,
  pair text not null,
  timeframe text not null,
  starting_equity numeric not null,
  final_equity numeric not null,
  pnl numeric not null,
  trades_count integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  ticks integer not null default 0,
  tick_interval_ms integer not null default 20000,
  risk_percent numeric not null default 0.75,
  state jsonb not null,
  market jsonb,
  started_at timestamptz not null,
  ended_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists sandbox_session_logs_user_ended_idx
  on public.sandbox_session_logs (user_id, ended_at desc);

alter table public.sandbox_session_logs enable row level security;
-- Solo service role / server
