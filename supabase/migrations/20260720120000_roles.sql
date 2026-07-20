-- Roles on profiles
alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin', 'support', 'analyst'));

create index if not exists profiles_role_idx on public.profiles (role);

-- Promote owner account (no-op if user not registered yet)
update public.profiles
set role = 'admin', updated_at = now()
where lower(email) = lower('moralesvega2909@hotmail.com');

-- Signup: assign admin to bootstrap email; everyone else starts as user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  initial_role text := 'user';
begin
  if lower(coalesce(new.email, '')) = lower('moralesvega2909@hotmail.com') then
    initial_role := 'admin';
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, new.email, initial_role);

  insert into public.bot_configs (user_id)
  values (new.id);

  return new;
end;
$$;

-- Users must not escalate their own role via profiles_update_own
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    -- Solo service_role (API admin) puede cambiar roles
    if auth.role() is distinct from 'service_role' then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trg on public.profiles;
create trigger protect_profile_role_trg
  before update on public.profiles
  for each row execute function public.protect_profile_role();
