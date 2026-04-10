# Rediscover Aura

Mood tracker MVP built with Next.js, Tailwind CSS v4, and Supabase.

## Local Setup

1. Install dependencies:
   - `npm install`
2. Create `.env.local` from `.env.example` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Run development server:
   - `npm run dev`

## Suggested Supabase Table

```sql
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
```

If RLS is enabled, add policies for your MVP access model before using the app.
