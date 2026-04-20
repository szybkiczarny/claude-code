-- Wklej to w Supabase SQL Editor

create table public.inspectors (
  id          uuid references auth.users primary key,
  full_name   text not null,
  company     text,
  phone       text,
  role        text default 'inspector',
  created_at  timestamptz default now()
);

create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  address       text not null,
  client_name   text,
  start_date    date,
  end_date      date,
  status        text default 'active',
  manager_id    uuid references public.inspectors(id),
  created_at    timestamptz default now()
);

create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade,
  inspector_id    uuid references public.inspectors(id),
  audio_url       text,
  transcript      text,
  ai_summary      text,
  pdf_url         text,
  weather         text,
  location_lat    decimal(9,6),
  location_lng    decimal(9,6),
  status          text default 'draft',
  created_at      timestamptz default now()
);

create table public.defects (
  id              uuid primary key default gen_random_uuid(),
  report_id       uuid references public.reports(id) on delete cascade,
  project_id      uuid references public.projects(id),
  description     text not null,
  severity        text default 'medium',
  photo_url       text,
  location_desc   text,
  status          text default 'open',
  created_at      timestamptz default now()
);

-- Row Level Security
alter table public.reports enable row level security;
alter table public.defects enable row level security;
alter table public.projects enable row level security;

create policy "Własne raporty" on public.reports
  for all using (inspector_id = auth.uid());

create policy "Własne usterki" on public.defects
  for all using (
    report_id in (select id from public.reports where inspector_id = auth.uid())
  );

create policy "Projekty widoczne" on public.projects
  for select using (true);
