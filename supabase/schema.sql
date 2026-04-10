-- Mood entries table for Rediscover Aura (run in Supabase SQL Editor or via migration tooling).

create table if not exists public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entry_date date not null,
  mood text not null check (mood in ('happy', 'neutral', 'sad', 'angry', 'anxious')),
  emotion_level int not null check (emotion_level >= 0 and emotion_level <= 100),
  stress_level int not null check (stress_level >= 0 and stress_level <= 100),
  energy_level int not null check (energy_level >= 0 and energy_level <= 100),
  note text,
  source text not null default 'manual'
);

create index if not exists mood_entries_entry_date_idx on public.mood_entries (entry_date);
create index if not exists mood_entries_created_at_idx on public.mood_entries (created_at desc);

-- Row Level Security (matches current client: anon key, no sign-in in the app).
-- Anyone with your anon key can read/insert. Tighten later with a user_id column and auth.uid() policies.
alter table public.mood_entries enable row level security;

drop policy if exists "mood_entries_select" on public.mood_entries;
drop policy if exists "mood_entries_insert" on public.mood_entries;

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

-- Updates/deletes are not granted here (not used by the app). Use the service role or add policies if you add those flows.
