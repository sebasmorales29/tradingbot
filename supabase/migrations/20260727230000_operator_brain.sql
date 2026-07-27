-- Cerebro global Keelra (producto a vender), no por usuario

create table if not exists public.operator_brain (
  id text primary key default 'keelra',
  is_active boolean not null default true,
  display_name text not null default 'Keelra Operator',
  model_version text not null default 'v2',
  last_trained_at timestamptz,
  train_sample_wins integer not null default 0,
  train_sample_losses integer not null default 0,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.operator_brain (id, is_active, display_name)
values ('keelra', true, 'Keelra Operator')
on conflict (id) do nothing;

alter table public.operator_brain enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'operator_brain'
      and policyname = 'operator_brain_read'
  ) then
    create policy operator_brain_read
      on public.operator_brain for select to authenticated using (true);
  end if;
end $$;

-- Conocimiento permanente enseñado al operador
create table if not exists public.operator_knowledge (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'note',
  title text not null,
  content text not null,
  effect jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  source text not null default 'manual',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operator_knowledge_kind_check check (
    kind in ('note', 'strategy', 'market', 'rule', 'lesson')
  )
);

create index if not exists operator_knowledge_active_idx
  on public.operator_knowledge (is_active, created_at desc);

alter table public.operator_knowledge enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'operator_knowledge'
      and policyname = 'operator_knowledge_read'
  ) then
    create policy operator_knowledge_read
      on public.operator_knowledge for select to authenticated using (true);
  end if;
end $$;

-- Chat de enseñanza (historial)
create table if not exists public.operator_chat_messages (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  content text not null,
  knowledge_id uuid references public.operator_knowledge (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint operator_chat_role_check check (role in ('user', 'assistant', 'system'))
);

create index if not exists operator_chat_created_idx
  on public.operator_chat_messages (created_at asc);

alter table public.operator_chat_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'operator_chat_messages'
      and policyname = 'operator_chat_read'
  ) then
    create policy operator_chat_read
      on public.operator_chat_messages for select to authenticated using (true);
  end if;
end $$;
