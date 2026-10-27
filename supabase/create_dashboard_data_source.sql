create table if not exists public.dashboard_data_source (
  id text primary key,
  data jsonb not null,
  file_name text,
  imported_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.dashboard_data_source enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dashboard_data_source'
      and policyname = 'dashboard_data_source_read'
  ) then
    create policy dashboard_data_source_read
      on public.dashboard_data_source
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dashboard_data_source'
      and policyname = 'dashboard_data_source_insert'
  ) then
    create policy dashboard_data_source_insert
      on public.dashboard_data_source
      for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'dashboard_data_source'
      and policyname = 'dashboard_data_source_update'
  ) then
    create policy dashboard_data_source_update
      on public.dashboard_data_source
      for update
      using (true)
      with check (true);
  end if;
end
$$;
