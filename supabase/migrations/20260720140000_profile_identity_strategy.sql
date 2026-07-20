-- Profile identity fields + editable strategy settings

alter table public.profiles
  add column if not exists first_name text;

alter table public.profiles
  add column if not exists last_name text;

alter table public.profiles
  add column if not exists date_of_birth date;

-- Backfill full_name display from existing data (no-op if empty)
update public.profiles
set full_name = trim(concat_ws(' ', first_name, last_name))
where full_name is null
  and (first_name is not null or last_name is not null);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  initial_role text := 'user';
  meta_first text;
  meta_last text;
  meta_dob date;
  display_name text;
begin
  if lower(coalesce(new.email, '')) = lower('moralesvega2909@hotmail.com') then
    initial_role := 'admin';
  end if;

  meta_first := nullif(trim(coalesce(new.raw_user_meta_data->>'first_name', '')), '');
  meta_last := nullif(trim(coalesce(new.raw_user_meta_data->>'last_name', '')), '');
  begin
    meta_dob := (new.raw_user_meta_data->>'date_of_birth')::date;
  exception when others then
    meta_dob := null;
  end;

  display_name := nullif(trim(concat_ws(' ', meta_first, meta_last)), '');
  if display_name is null then
    display_name := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
  end if;

  insert into public.profiles (
    id, email, role, first_name, last_name, date_of_birth, full_name
  )
  values (
    new.id,
    new.email,
    initial_role,
    meta_first,
    meta_last,
    meta_dob,
    display_name
  );

  insert into public.bot_configs (user_id)
  values (new.id);

  return new;
end;
$$;

-- Global Trend Pulse params (single row)
create table if not exists public.strategy_settings (
  id text primary key default 'trend_pulse',
  name text not null default 'Trend Pulse',
  timeframe text not null default '4h',
  fast integer not null default 20,
  slow integer not null default 50,
  atr_period integer not null default 14,
  stop_atr numeric not null default 1.5,
  tp_atr numeric not null default 2.5,
  min_atr_pct numeric not null default 0.4,
  max_atr_pct numeric not null default 6,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint strategy_settings_fast_check check (fast >= 2 and fast < slow),
  constraint strategy_settings_slow_check check (slow <= 500),
  constraint strategy_settings_atr_check check (atr_period >= 2 and atr_period <= 100),
  constraint strategy_settings_stop_check check (stop_atr > 0 and stop_atr <= 20),
  constraint strategy_settings_tp_check check (tp_atr > 0 and tp_atr <= 40),
  constraint strategy_settings_min_check check (min_atr_pct >= 0 and min_atr_pct < max_atr_pct),
  constraint strategy_settings_max_check check (max_atr_pct <= 50)
);

alter table public.strategy_settings enable row level security;

-- No public policies: only service role / server reads & writes

insert into public.strategy_settings (id)
values ('trend_pulse')
on conflict (id) do nothing;
