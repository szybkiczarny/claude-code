-- NAPRAWA SCHEMATU — wklej całość w Supabase SQL Editor

-- 1. Upewnij się że tabela projects istnieje z właściwą strukturą
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  client_name text,
  status      text default 'active',
  manager_id  uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- 2. Dodaj brakujące kolumny jeśli tabela już istniała
alter table public.projects
  add column if not exists manager_id uuid references auth.users(id),
  add column if not exists client_name text,
  alter column address drop not null;

-- 3. Tabela reports
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects(id) on delete cascade,
  inspector_id uuid references auth.users(id),
  transcript   text,
  ai_summary   text,
  weather      text,
  lat          decimal(9,6),
  lng          decimal(9,6),
  status       text default 'done',
  created_at   timestamptz default now()
);
alter table public.reports
  add column if not exists inspector_id uuid references auth.users(id),
  add column if not exists lat decimal(9,6),
  add column if not exists lng decimal(9,6);

-- 4. Tabela defects
create table if not exists public.defects (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid references public.reports(id) on delete cascade,
  project_id    uuid references public.projects(id),
  description   text not null,
  severity      text default 'medium',
  location_desc text,
  subcontractor text,
  deadline      date,
  action        text,
  photo_url     text,
  status        text default 'open',
  created_at    timestamptz default now()
);
alter table public.defects
  add column if not exists subcontractor text,
  add column if not exists deadline date,
  add column if not exists action text,
  add column if not exists photo_url text;

-- 5. Tabela crew
create table if not exists public.crew (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  report_id   uuid references public.reports(id),
  role        text not null,
  company     text,
  count       int default 1,
  recorded_at date default current_date,
  created_at  timestamptz default now()
);

-- 6. Tabela materials
create table if not exists public.materials (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  report_id   uuid references public.reports(id),
  name        text not null,
  qty         text,
  delivery    text,
  created_at  timestamptz default now()
);

-- 7. RLS — włącz
alter table public.projects  enable row level security;
alter table public.reports   enable row level security;
alter table public.defects   enable row level security;
alter table public.crew      enable row level security;
alter table public.materials enable row level security;

-- 8. Usuń stare polisy
drop policy if exists "Projekty widoczne"    on public.projects;
drop policy if exists "own projects"         on public.projects;
drop policy if exists "projects_all"         on public.projects;
drop policy if exists "Własne raporty"       on public.reports;
drop policy if exists "own reports"          on public.reports;
drop policy if exists "Własne usterki"       on public.defects;
drop policy if exists "own defects"          on public.defects;
drop policy if exists "own crew"             on public.crew;
drop policy if exists "own materials"        on public.materials;

-- 9. Nowe polisy — pełny dostęp do własnych danych
create policy "own projects"  on public.projects  for all using (manager_id  = auth.uid()) with check (manager_id = auth.uid());
create policy "own reports"   on public.reports   for all using (inspector_id = auth.uid()) with check (inspector_id = auth.uid());
create policy "own defects"   on public.defects   for all using (
  project_id in (select id from public.projects where manager_id = auth.uid())
);
create policy "own crew"      on public.crew      for all using (
  project_id in (select id from public.projects where manager_id = auth.uid())
);
create policy "own materials" on public.materials for all using (
  project_id in (select id from public.projects where manager_id = auth.uid())
);
