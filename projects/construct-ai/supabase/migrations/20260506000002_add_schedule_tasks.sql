create table schedule_tasks (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references projects(id) on delete cascade not null,
  name          text not null,
  duration_days int  not null default 1,
  depends_on    uuid[] default '{}',
  planned_start date,
  actual_start  date,
  actual_end    date,
  status        text not null default 'todo' check (status in ('todo','in_progress','done')),
  sort_order    int  not null default 0,
  created_at    timestamptz default now()
);

-- RLS
alter table schedule_tasks enable row level security;
create policy "schedule_tasks_select" on schedule_tasks for select using (true);
create policy "schedule_tasks_insert" on schedule_tasks for insert with check (true);
create policy "schedule_tasks_update" on schedule_tasks for update using (true);
create policy "schedule_tasks_delete" on schedule_tasks for delete using (true);
