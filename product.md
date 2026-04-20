# Product Requirements Document: Rediscover Aura - Mood Tracker MVP

## 1. Project Overview

**Project:** Rediscover Aura  
**Goal:** Deliver a fully operable mood tracker MVP for a virtual wellness platform that feels production-ready, supports real persistence, and is ready for iterative expansion.

## 2. Tech Stack & Infrastructure

- **Frontend:** Next.js (App Router) + Tailwind CSS + TypeScript
- **Backend/Database:** Supabase (PostgreSQL)
- **Hosting/Deployment:** Vercel
- **Version Control:** GitHub

## 3. Core Features & Requirements

For MVP, the product is single-user and focused on one primary logging experience with supporting overlays.

### 3.1 Interactive Mood Selection

- **UI Element:** Emoji-based selection interface.
- **Mood Categories:**
  - Happy
  - Neutral
  - Sad
  - Angry
  - Anxious
- **Behavior:** Selecting an emoji sets the active mood state and pre-populates emotional levels.

### 3.2 Multi-dimensional Emotional Levels

- **Mechanism:** Mood selection auto-fills three emotional dimensions displayed as linear scales.
- **Dimensions Tracked:**
  - Emotion
  - Stress
  - Energy
- **Value Range:** 1 to 5 inclusive per dimension (linear scale, consumer-friendly labels; no percentage UI).

### 3.2.1 Optional context note

- Users may add a **short optional text** explaining what is behind their feeling (e.g. stress source).
- Notes appear with the entry in **calendar day detail**.

### 3.2.2 Autosave

- Check-ins **save automatically** after the user pauses editing (debounced), with clear “Saving…” / “Saved” feedback.

### 3.3 History & Calendar

- **UI Element:** Calendar icon.
- **Functionality:** Opens a monthly history view with day-level markers for logged entries.
- **Behavior:** Selecting a day shows that day’s mood entries, recorded levels, and any note text.

### 3.4 Predictive Insights

- **UI Element:** Lightbulb icon.
- **Functionality:** Opens insights panel with deterministic, fictitious insights derived from logged behavior patterns.
- **Time framing:** Copy references a **specific rolling window** (e.g. “Over the past 5 days”), not vague “recent.”
- **Platform hooks:** Copy may softly reference future Rediscover Aura modules (journaling, experiences, retreats) without implying those features are live.
- **Data Source:** Dummy/rule-based logic for MVP (no ML).

### 3.5 MVP Scope Boundaries

**In Scope:**
- Single-user mood logging flow
- Supabase-backed persistence for entries
- Month-view history calendar with day details
- Predictive insights panel using deterministic dummy logic
- Responsive mobile + desktop experience

**Out of Scope (Post-MVP):**
- Authentication and multi-user accounts
- Real AI/ML prediction engine
- Push notifications and reminders
- Wearables or third-party health integrations

## 4. UI/UX & Design Guidelines

- **Aesthetic Direction:** Lux, airy, wellness-focused, with confident white space and soft premium contrast.
- **Core Layout:**
  - Header with "How are you feeling today?"
  - Lightbulb (insights) and Calendar (history) quick actions
  - Horizontal emoji mood selector
  - Emotion/Stress/Energy linear 1–5 scales
  - Autosave with visible save status (no required manual save for MVP)
- **Responsiveness:** Full functionality on mobile and desktop with no feature loss.
- **Accessibility Baseline:** Keyboard-accessible controls, visible focus states, semantic labels, clear loading/empty/error states.

## 4.1 Feature Acceptance Criteria

### Mood Selection
- Selecting a mood visibly updates selected state and auto-populates all three levels (1–5).
- Scales and optional note are available only after a mood is selected.

### Logging & Persistence
- Autosave creates a new entry in Supabase (or local fallback) after edits settle.
- Reloading the app preserves prior entries from Supabase.
- Failed save/load states show clear user feedback and retry path.

### History
- Calendar view renders current month and marks dates with entries.
- User can select a date and view all logs for that day, including optional notes.

### Insights
- Insights panel displays at least 3 deterministic insight messages tied to the past 5 days of data when available.
- Insights remain readable and visually consistent on mobile.

## 4.2 UX Quality Bar (Ship Criteria)

- No layout breakage at 320px, 768px, and 1280px widths.
- All icon-button targets are at least 44x44px.
- No blocking interaction exceeds 300ms without visible feedback.
- Loading, empty, and error states exist for history and persistence flow.
- Motion is subtle and respects `prefers-reduced-motion`.

## 5. Milestones & Exit Criteria

### M1 Foundation
- Project setup complete, Tailwind configured, Supabase environment wired.
- Exit Criteria: App runs locally; schema documented; deployment path defined.

### M2 Core Logging
- Mood selection, auto-fill levels, and save flow implemented.
- Exit Criteria: Entries can be created and validated end-to-end.

### M3 Data Views
- Calendar history and insights views integrated.
- Exit Criteria: Day markers + day detail render from persisted entries.

### M4 Release Candidate
- UI polish, responsive QA, accessibility baseline, and bug fixes complete.
- Exit Criteria: Lint/build pass, no open P0/P1 issues, demo-ready handoff.

**Final Deadline:** May 1, 2026.

## 6. Data Model (Product-Level)

### Entity: `mood_entry`

- `id` (uuid, primary key)
- `created_at` (timestamp with timezone, server-generated)
- `entry_date` (date, user-local derived date for calendar grouping)
- `mood` (enum: happy | neutral | sad | angry | anxious)
- `emotion_level` (int, 1..5)
- `stress_level` (int, 1..5)
- `energy_level` (int, 1..5)
- `note` (optional text, nullable)
- `source` (text, default: manual)

### Data Integrity Rules

- `mood`, `emotion_level`, `stress_level`, `energy_level`, and `entry_date` are required.
- Timestamp remains immutable once inserted.
- Levels outside 1..5 are rejected.

## 7. Future Considerations (Post-MVP)

- Multi-user account support and authentication.
- Real analytics and ML-driven predictive insights.
- Full integration into the broader Rediscover Aura platform ecosystem.
