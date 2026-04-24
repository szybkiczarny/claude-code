-- Dodaj brakujące kolumny
alter table public.projects add column if not exists manager_id uuid references auth.users(id);
alter table public.reports  add column if not exists lat float8;
alter table public.reports  add column if not exists lng float8;
alter table public.defects  add column if not exists subcontractor text;
alter table public.defects  add column if not exists deadline text;
alter table public.defects  add column if not exists action text;

-- Usuń stare permisywne polityki
drop policy if exists "projects_all" on public.projects;
drop policy if exists "reports_all"  on public.reports;
drop policy if exists "defects_all"  on public.defects;

-- Nowe polityki — każdy widzi tylko swoje
create policy "own projects" on public.projects
  using (manager_id = auth.uid())
  with check (manager_id = auth.uid());

create policy "own reports" on public.reports
  using (project_id in (select id from public.projects where manager_id = auth.uid()))
  with check (project_id in (select id from public.projects where manager_id = auth.uid()));

create policy "own defects" on public.defects
  using (project_id in (select id from public.projects where manager_id = auth.uid()))
  with check (project_id in (select id from public.projects where manager_id = auth.uid()));

-- ============================================================
-- Tabela contractors (wykonawcy/podwykonawcy)
-- ============================================================
create table if not exists public.contractors (
  id uuid default gen_random_uuid() primary key,
  manager_id uuid references auth.users(id) not null,
  name text not null,
  email text,
  phone text,
  trade text,
  created_at timestamptz default now()
);

alter table public.contractors enable row level security;

drop policy if exists "own contractors" on public.contractors;
create policy "own contractors" on public.contractors
  using (manager_id = auth.uid())
  with check (manager_id = auth.uid());
