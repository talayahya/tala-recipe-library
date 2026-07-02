create table if not exists daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  label text not null,
  calories numeric default 0,
  protein numeric default 0,
  carbs numeric default 0,
  fat numeric default 0,
  fibre numeric default 0,
  added_sugar numeric default 0,
  natural_sugar numeric default 0,
  details jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table daily_entries enable row level security;

create policy "Users can read their own entries"
on daily_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own entries"
on daily_entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own entries"
on daily_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own entries"
on daily_entries
for delete
to authenticated
using (auth.uid() = user_id);
