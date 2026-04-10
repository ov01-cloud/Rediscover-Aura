# Rediscover Aura

Mood tracker MVP built with Next.js, Tailwind CSS v4, and Supabase.

## Local Setup

1. Install dependencies:
   - `npm install`
2. Create `.env.local` from `.env.example` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. If you use Supabase for persistence, apply the database schema in `supabase/schema.sql` (for example in the Supabase SQL Editor).
4. Run the development server:
   - `npm run dev`

Without Supabase env vars, the app runs in **local fallback mode** (mood data stored in the browser).
