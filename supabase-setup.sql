-- Food Log — Supabase schema + Row Level Security
-- Safe to run multiple times (idempotent). Paste into the Supabase SQL editor and Run.

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

-- Make sure every expected column exists even if the table was created earlier.
alter table daily_entries add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table daily_entries add column if not exists entry_date date;
alter table daily_entries add column if not exists label text;
alter table daily_entries add column if not exists calories numeric default 0;
alter table daily_entries add column if not exists protein numeric default 0;
alter table daily_entries add column if not exists carbs numeric default 0;
alter table daily_entries add column if not exists fat numeric default 0;
alter table daily_entries add column if not exists fibre numeric default 0;
alter table daily_entries add column if not exists added_sugar numeric default 0;
alter table daily_entries add column if not exists natural_sugar numeric default 0;
alter table daily_entries add column if not exists details jsonb default '[]'::jsonb;
alter table daily_entries add column if not exists created_at timestamptz default now();

create index if not exists daily_entries_user_date_idx on daily_entries (user_id, entry_date);

alter table daily_entries enable row level security;

drop policy if exists "Users can read their own entries" on daily_entries;
create policy "Users can read their own entries"
on daily_entries
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own entries" on daily_entries;
create policy "Users can insert their own entries"
on daily_entries
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own entries" on daily_entries;
create policy "Users can update their own entries"
on daily_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own entries" on daily_entries;
create policy "Users can delete their own entries"
on daily_entries
for delete
to authenticated
using (auth.uid() = user_id);
