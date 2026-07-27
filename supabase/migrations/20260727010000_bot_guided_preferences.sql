alter table public.bot_configs
  add column if not exists preferences jsonb not null default '{}'::jsonb;
