-- Allow multiple mood check-ins per calendar day per profile (separate timestamps).
-- Run after migrate-owner-tag.sql if that unique index was applied.

drop index if exists public.mood_entries_owner_date_uniq;

create index if not exists mood_entries_owner_date_created_idx
  on public.mood_entries (owner_tag, entry_date desc, created_at desc);

-- Optional: suggestion follow-through (see schema.sql for full DDL if table missing).
create table if not exists public.suggestion_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_tag text not null default 'default' check (owner_tag in ('default', 'test_user_a', 'test_user_b')),
  mood_entry_id uuid references public.mood_entries (id) on delete set null,
  suggestion_key text not null,
  event text not null check (event in ('shown', 'acted'))
);

create index if not exists suggestion_events_owner_created_idx
  on public.suggestion_events (owner_tag, created_at desc);

alter table public.suggestion_events enable row level security;

drop policy if exists "suggestion_events_select" on public.suggestion_events;
drop policy if exists "suggestion_events_insert" on public.suggestion_events;

create policy "suggestion_events_select"
  on public.suggestion_events
  for select
  to anon, authenticated
  using (true);

create policy "suggestion_events_insert"
  on public.suggestion_events
  for insert
  to anon, authenticated
  with check (true);
