-- Mensajes de la vista de pruebas del Operador (pueden incluir imagen)

create table if not exists public.operator_test_messages (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  content text not null,
  image_data text,
  promoted_knowledge_id uuid references public.operator_knowledge (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint operator_test_role_check check (role in ('user', 'assistant', 'system'))
);

create index if not exists operator_test_created_idx
  on public.operator_test_messages (created_at asc);

alter table public.operator_test_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'operator_test_messages'
      and policyname = 'operator_test_read'
  ) then
    create policy operator_test_read
      on public.operator_test_messages
      for select
      to authenticated
      using (true);
  end if;
end $$;
