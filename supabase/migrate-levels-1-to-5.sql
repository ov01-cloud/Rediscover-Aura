-- Run once if mood_entries was created with 0–100 level checks.
-- Maps existing values to 1–5, then tightens constraints.

alter table public.mood_entries drop constraint if exists mood_entries_emotion_level_check;
alter table public.mood_entries drop constraint if exists mood_entries_stress_level_check;
alter table public.mood_entries drop constraint if exists mood_entries_energy_level_check;

-- Only remap rows that still use the old 0–100 scale (any column > 5).
update public.mood_entries
set
  emotion_level = greatest(1, least(5, round((emotion_level::numeric / 100) * 4 + 1)::int)),
  stress_level = greatest(1, least(5, round((stress_level::numeric / 100) * 4 + 1)::int)),
  energy_level = greatest(1, least(5, round((energy_level::numeric / 100) * 4 + 1)::int))
where greatest(emotion_level, stress_level, energy_level) > 5;

alter table public.mood_entries
  add constraint mood_entries_emotion_level_check check (emotion_level >= 1 and emotion_level <= 5);

alter table public.mood_entries
  add constraint mood_entries_stress_level_check check (stress_level >= 1 and stress_level <= 5);

alter table public.mood_entries
  add constraint mood_entries_energy_level_check check (energy_level >= 1 and energy_level <= 5);
