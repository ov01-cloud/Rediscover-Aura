-- Apply on existing Rediscover Aura databases that predate the owner_tag + upsert work.
-- Run in the Supabase SQL editor (or supabase db push / MCP apply migration).

-- 1) Column for profile / "data switcher" isolation
alter table public.mood_entries
  add column if not exists owner_tag text not null default 'default';

-- 2) Safe check constraint (add only if missing)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mood_entries_owner_tag_check'
  ) then
    alter table public.mood_entries
      add constraint mood_entries_owner_tag_check
      check (owner_tag in ('default', 'test_user_a', 'test_user_b'));
  end if;
end $$;

-- 3) Deduplicate: keep the newest row per (owner_tag, entry_date)
with ranked as (
  select
    id,
    row_number() over (
      partition by owner_tag, entry_date
      order by created_at desc, id desc
    ) as rn
  from public.mood_entries
)
delete from public.mood_entries m
using ranked r
where m.id = r.id
  and r.rn > 1;

-- 4) One check-in per profile per day
create unique index if not exists mood_entries_owner_date_uniq
  on public.mood_entries (owner_tag, entry_date);

-- 5) RLS: allow client updates (same anon pattern as select/insert)
drop policy if exists "mood_entries_update" on public.mood_entries;
create policy "mood_entries_update"
  on public.mood_entries
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- 6) Seed test profiles: replace prior seeded rows in the last 30 days (idempotent re-runs)
delete from public.mood_entries
where owner_tag in ('test_user_a', 'test_user_b')
  and entry_date >= (current_date - interval '30 days')::date;

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
) as d;

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
) as d;
