-- Seguimiento de investigación web del Operador global

alter table public.operator_brain
  add column if not exists last_research_at timestamptz,
  add column if not exists research_items_count integer not null default 0,
  add column if not exists auto_research_enabled boolean not null default true;

create table if not exists public.operator_research_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  sources_ok integer not null default 0,
  sources_failed integer not null default 0,
  items_seen integer not null default 0,
  items_learned integer not null default 0,
  summary text,
  error text,
  triggered_by text not null default 'cron'
);

create index if not exists operator_research_runs_started_idx
  on public.operator_research_runs (started_at desc);

alter table public.operator_research_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'operator_research_runs'
      and policyname = 'operator_research_read'
  ) then
    create policy operator_research_read
      on public.operator_research_runs
      for select
      to authenticated
      using (true);
  end if;
end $$;
