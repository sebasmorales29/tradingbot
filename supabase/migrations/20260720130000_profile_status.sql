-- Account status for suspend / soft-disable
alter table public.profiles
  add column if not exists status text not null default 'active';

alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'suspended'));

create index if not exists profiles_status_idx on public.profiles (status);

-- Protect status from self-service escalation (same as role)
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if auth.role() is distinct from 'service_role' then
      if new.role is distinct from old.role then
        new.role := old.role;
      end if;
      if new.status is distinct from old.status then
        new.status := old.status;
      end if;
    end if;
  end if;
  return new;
end;
$$;
