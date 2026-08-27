
-- Pádel Point - esquema inicial para Supabase

create type public.app_role as enum ('admin','employee');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role public.app_role not null default 'employee'
);

create table public.classes (
  id bigint generated always as identity primary key,
  date date not null,
  time time,
  student_name text not null,
  teacher_name text,
  status text default 'Pendiente',
  payment_status text default 'Pendiente',
  value numeric(12,2) default 0,
  created_at timestamptz default now()
);

create table public.open_courts (
  id bigint generated always as identity primary key,
  date date not null,
  time time,
  category text not null,
  slots integer default 8,
  registered integer default 0,
  value numeric(12,2) default 0,
  status text default 'Abierta',
  created_at timestamptz default now()
);

create table public.own_tournaments (
  id bigint generated always as identity primary key,
  date date not null,
  name text not null,
  category text,
  pairs integer default 0,
  expected_income numeric(12,2) default 0,
  status text default 'Planificado',
  created_at timestamptz default now()
);

create table public.third_party_tournaments (
  id bigint generated always as identity primary key,
  date date not null,
  organizer text not null,
  courts integer default 0,
  value numeric(12,2) default 0,
  balance numeric(12,2) default 0,
  status text default 'Reservado',
  created_at timestamptz default now()
);

create table public.corporate_events (
  id bigint generated always as identity primary key,
  date date not null,
  company text not null,
  people integer default 0,
  budget numeric(12,2) default 0,
  balance numeric(12,2) default 0,
  status text default 'Presupuesto',
  created_at timestamptz default now()
);

create table public.people (
  id bigint generated always as identity primary key,
  name text not null,
  type text not null,
  phone text,
  status text default 'Activo',
  created_at timestamptz default now()
);

create table public.financial_movements (
  id bigint generated always as identity primary key,
  date date not null,
  type text not null check (type in ('income','expense')),
  category text not null,
  description text not null,
  amount numeric(12,2) not null,
  source_type text,
  source_id bigint,
  created_at timestamptz default now()
);

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.open_courts enable row level security;
alter table public.own_tournaments enable row level security;
alter table public.third_party_tournaments enable row level security;
alter table public.corporate_events enable row level security;
alter table public.people enable row level security;
alter table public.financial_movements enable row level security;

-- Perfil propio
create policy "profile own read" on public.profiles
for select to authenticated
using (id = auth.uid());

-- Operación: admin y empleado autenticado pueden leer/escribir
create policy "classes read" on public.classes for select to authenticated using (true);
create policy "classes insert" on public.classes for insert to authenticated with check (true);
create policy "classes update" on public.classes for update to authenticated using (true) with check (true);
create policy "classes delete" on public.classes for delete to authenticated using (true);

create policy "open courts read" on public.open_courts for select to authenticated using (true);
create policy "open courts insert" on public.open_courts for insert to authenticated with check (true);
create policy "open courts update" on public.open_courts for update to authenticated using (true) with check (true);
create policy "open courts delete" on public.open_courts for delete to authenticated using (true);

create policy "own tournaments read" on public.own_tournaments for select to authenticated using (true);
create policy "own tournaments insert" on public.own_tournaments for insert to authenticated with check (true);
create policy "own tournaments update" on public.own_tournaments for update to authenticated using (true) with check (true);
create policy "own tournaments delete" on public.own_tournaments for delete to authenticated using (true);

create policy "third tournaments read" on public.third_party_tournaments for select to authenticated using (true);
create policy "third tournaments insert" on public.third_party_tournaments for insert to authenticated with check (true);
create policy "third tournaments update" on public.third_party_tournaments for update to authenticated using (true) with check (true);
create policy "third tournaments delete" on public.third_party_tournaments for delete to authenticated using (true);

create policy "corporate read" on public.corporate_events for select to authenticated using (true);
create policy "corporate insert" on public.corporate_events for insert to authenticated with check (true);
create policy "corporate update" on public.corporate_events for update to authenticated using (true) with check (true);
create policy "corporate delete" on public.corporate_events for delete to authenticated using (true);

create policy "people read" on public.people for select to authenticated using (true);
create policy "people insert" on public.people for insert to authenticated with check (true);
create policy "people update" on public.people for update to authenticated using (true) with check (true);
create policy "people delete" on public.people for delete to authenticated using (true);

-- Finanzas: SOLO admin, también a nivel base de datos
create policy "finance admin read" on public.financial_movements
for select to authenticated
using (public.current_user_role() = 'admin');

create policy "finance admin insert" on public.financial_movements
for insert to authenticated
with check (public.current_user_role() = 'admin');

create policy "finance admin update" on public.financial_movements
for update to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "finance admin delete" on public.financial_movements
for delete to authenticated
using (public.current_user_role() = 'admin');

-- Trigger: crear perfil employee al crear usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'employee');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Después de crear TU usuario, cambiarlo a admin:
-- update public.profiles set role='admin' where id='UUID_DE_TU_USUARIO';
