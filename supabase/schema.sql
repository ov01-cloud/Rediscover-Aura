-- Mood entries table for Rediscover Aura (run in Supabase SQL Editor or via migration tooling).

create table if not exists public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entry_date date not null,
  owner_tag text not null default 'default' check (owner_tag in ('default', 'test_user_a', 'test_user_b')),
  mood text not null check (mood in ('happy', 'neutral', 'sad', 'angry', 'anxious')),
  emotion_level int not null check (emotion_level >= 1 and emotion_level <= 5),
  stress_level int not null check (stress_level >= 1 and stress_level <= 5),
  energy_level int not null check (energy_level >= 1 and energy_level <= 5),
  note text,
  source text not null default 'manual'
);

create unique index if not exists mood_entries_owner_date_uniq
  on public.mood_entries (owner_tag, entry_date);

create index if not exists mood_entries_entry_date_idx on public.mood_entries (entry_date);
create index if not exists mood_entries_created_at_idx on public.mood_entries (created_at desc);

-- Row Level Security (matches current client: anon key, no sign-in in the app).
alter table public.mood_entries enable row level security;

drop policy if exists "mood_entries_select" on public.mood_entries;
drop policy if exists "mood_entries_insert" on public.mood_entries;
drop policy if exists "mood_entries_update" on public.mood_entries;

create policy "mood_entries_select"
  on public.mood_entries
  for select
  to anon, authenticated
  using (true);

create policy "mood_entries_insert"
  on public.mood_entries
  for insert
  to anon, authenticated
  with check (true);

create policy "mood_entries_update"
  on public.mood_entries
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- Sample rows for "Test user A" / "Test user B" (safe to re-run: skips conflicts).
insert into public.mood_entries
  (entry_date, owner_tag, mood, emotion_level, stress_level, energy_level, source, note)
select
  d::date,
  'test_user_a',
  (array['happy', 'neutral', 'sad', 'anxious', 'angry']::text[])[1 + (abs(hashtext(d::text)) % 5)],
  1 + (abs(hashtext('e' || d::text)) % 5),
  1 + (abs(hashtext('s' || d::text)) % 5),
  1 + (abs(hashtext('n' || d::text)) % 5),
  'manual',
  'Seeded for Test user A (data review & analysis)'
from generate_series(
  (current_date - 27)::timestamp,
  current_date::timestamp,
  '1 day'::interval
) as d
on conflict (owner_tag, entry_date) do nothing;

insert into public.mood_entries
  (entry_date, owner_tag, mood, emotion_level, stress_level, energy_level, source, note)
select
  d::date,
  'test_user_b',
  (array['happy', 'neutral', 'sad', 'anxious', 'angry']::text[])[1 + (abs(hashtext('B' || d::text)) % 5)],
  1 + (abs(hashtext('B-e' || d::text)) % 5),
  1 + (abs(hashtext('B-s' || d::text)) % 5),
  1 + (abs(hashtext('B-n' || d::text)) % 5),
  'manual',
  'Seeded for Test user B (data review & analysis)'
from generate_series(
  (current_date - 27)::timestamp,
  current_date::timestamp,
  '1 day'::interval
) as d
on conflict (owner_tag, entry_date) do nothing;
