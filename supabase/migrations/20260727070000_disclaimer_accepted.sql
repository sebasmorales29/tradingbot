alter table public.bot_configs
  add column if not exists disclaimer_accepted_at timestamptz;
