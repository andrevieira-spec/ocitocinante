-- Ensure has_role function exists and is RLS-safe
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

-- Ensure RLS is enabled on user_roles
alter table if exists public.user_roles enable row level security;

-- Create policies safely if they don't exist
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_roles'
      and policyname = 'Users can read own roles'
  ) then
    create policy "Users can read own roles"
    on public.user_roles
    for select
    to authenticated
    using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_roles'
      and policyname = 'Admins can read all roles'
  ) then
    create policy "Admins can read all roles"
    on public.user_roles
    for select
    to authenticated
    using (public.has_role(auth.uid(), 'admin'::public.app_role));
  end if;
end $$;