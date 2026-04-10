# Implementation Plan: Rediscover Aura - Mood Tracker MVP

## Architecture & Product Shape

Rediscover Aura MVP is one core screen with supporting overlays:
1. **Main Logging View** (mood selection + scales + save)
2. **History Calendar View** (month grid + selected-day logs)
3. **Insights View** (deterministic, data-informed suggestions)

**Stack:** Next.js (App Router), Tailwind CSS v4, TypeScript, Supabase, Vercel

## Delivery Definition (Done Criteria)

This pass is considered done only when all conditions are true:
- Supabase create/read flow works in local and deployed environments.
- Calendar history shows month markers and day-level detail.
- Insights are available with useful deterministic messages.
- Responsive behavior passes at 320px, 768px, and 1280px.
- Lint and production build pass with no blocking errors.
- No open P0/P1 defects.

## Milestones, Dependencies, and Exit Criteria

### M1 Foundation
**Work:**
- Finalize environment setup and Supabase connection.
- Define and document `mood_entries` schema.
- Prepare `.env.example` and setup docs.

**Exit Criteria:**
- Supabase client can initialize from env vars.
- Schema contract is documented and consistent with product spec.

### M2 Core Mood Logging
**Depends on:** M1  
**Work:**
- Implement mood selection, level auto-fill mapping, and save action.
- Validate and persist entries to Supabase.
- Add loading/success/error feedback for save flow.

**Exit Criteria:**
- User can select mood and save a valid entry.
- Failed save path is visible and recoverable.

### M3 History & Insights Views
**Depends on:** M2  
**Work:**
- Build month calendar with logged-day markers.
- Add selected-day detail list.
- Integrate deterministic insights using logged behavior and safe fallback.

**Exit Criteria:**
- Calendar markers reflect saved data.
- Selecting a day reveals entries for that date.
- Insights view is usable on mobile and desktop.

### M4 Impeccable UI/UX Polish + QA Gate
**Depends on:** M3  
**Work:**
- Apply premium visual hierarchy (spacing, typography, color rhythm).
- Improve interaction details (focus states, hover/press feedback, reduced motion support).
- Perform responsive and accessibility checks.

**Exit Criteria:**
- UI quality is client-facing and visually coherent.
- Keyboard navigation and focus visibility are correct.
- No layout breakage at required breakpoints.

## API/Data Flow Contract

### Data Contract: `mood_entries`
- `id` uuid
- `created_at` timestamptz
- `entry_date` date
- `mood` text enum-like value (`happy|neutral|sad|angry|anxious`)
- `emotion_level`, `stress_level`, `energy_level` integers in 0..100
- `note` nullable text
- `source` text (`manual`)

### Required Operations
- `createMoodEntry(payload)` validates range + mood, inserts entry, returns inserted row.
- `listMoodEntriesByMonth(year, month)` returns entries for calendar rendering.
- `listMoodEntriesByDate(entryDate)` returns entries for selected-day detail.

### Error Handling Rules
- Persist/load failures must show clear in-UI messages.
- UI cannot silently fail on network/database errors.

## QA & Test Plan

### Functional Checks
- Mood selection updates scales correctly.
- Save creates entry and appears in history.
- Day marker appears on correct calendar date.
- Insights view opens/closes and renders content.

### Responsiveness Checks
- 320px: no cut-off controls, actions remain reachable.
- 768px: balanced layout and readable hierarchy.
- 1280px: maintained visual rhythm and spacing.

### Accessibility Checks
- Interactive controls are keyboard reachable.
- Focus states visible on all major controls.
- Buttons/icons include accessible labels.

### Release Gate
- Block release for any P0/P1 issue.
- Allow P2 only with explicit follow-up list.

## Timeline and Change Control

- **Target Deadline:** May 1, 2026
- **Risk Buffer:** Reserve final half-day for fixes and deployment verification.
- **Feature Freeze:** No new MVP-scope additions after M3 without explicit approval.

## Post-MVP Iterations

- **Iteration 2:** Feedback-driven UI refinement, improved insights logic, calendar enhancements.
- **Iteration 3:** Hardening, edge-case coverage, and integration-ready cleanup.
