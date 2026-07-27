-- Operator calibration (global) + signal meta for regime/score audit

alter table public.signals
  add column if not exists meta jsonb not null default '{}'::jsonb;

alter table public.signals
  add column if not exists strength numeric;

create table if not exists public.operator_calibration (
  id uuid primary key default gen_random_uuid(),
  pair text not null,
  regime text not null,
  trades_count integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  win_rate numeric,
  expectancy numeric,
  soft_fail_delta integer not null default 0,
  volume_mult_delta numeric not null default 0,
  min_score numeric not null default 45,
  updated_at timestamptz not null default now(),
  constraint operator_calibration_pair_regime_uq unique (pair, regime),
  constraint operator_calibration_regime_check check (
    regime in ('trend_up', 'trend_down', 'range', 'high_vol')
  )
);

create index if not exists operator_calibration_updated_idx
  on public.operator_calibration (updated_at desc);

alter table public.operator_calibration enable row level security;

-- Readable by authenticated users (global operator brain)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'operator_calibration'
      and policyname = 'operator_calibration_read'
  ) then
    create policy operator_calibration_read
      on public.operator_calibration
      for select
      to authenticated
      using (true);
  end if;
end $$;
