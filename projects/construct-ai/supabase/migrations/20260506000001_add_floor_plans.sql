create table floor_plans (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references projects(id) on delete cascade not null,
  name        text not null,
  image_url   text not null,
  created_at  timestamptz default now()
);

alter table defects
  add column floor_plan_id uuid references floor_plans(id) on delete set null,
  add column pin_x         real,
  add column pin_y         real;

-- RLS
alter table floor_plans enable row level security;
create policy "floor_plans_select" on floor_plans for select using (true);
create policy "floor_plans_insert" on floor_plans for insert with check (true);
create policy "floor_plans_delete" on floor_plans for delete using (true);
