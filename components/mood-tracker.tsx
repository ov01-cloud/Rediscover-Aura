"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Lightbulb, Loader2, Sparkles, X } from "lucide-react";
import { INSIGHT_WINDOW_DAYS, generateInsights } from "@/lib/insights";
import { createMoodEntry, listMoodEntriesBetween, listMoodEntriesByMonth } from "@/lib/mood-entries";
import { getLocalEntryDate, getMoodOption, MoodEntry, MoodKey, MOOD_OPTIONS } from "@/lib/mood-config";
import { normalizeLevel } from "@/lib/level-scale";
import { canUseSupabase } from "@/lib/supabase-client";

const STORAGE_KEY = "rediscover-aura:mood-entries";
const NOTE_MAX_LENGTH = 280;
const AUTOSAVE_MS = 1200;

type AutosaveStatus = "idle" | "saving" | "saved" | "error";

function Scale1to5({
  label,
  lowLabel,
  highLabel,
  value,
  onChange,
  disabled
}: {
  label: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const steps = [1, 2, 3, 4, 5] as const;
  return (
    <div className={`space-y-2 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-aura-text">{label}</p>
        <p className="text-sm tabular-nums text-aura-muted">
          <span className="font-medium text-aura-text">{value}</span>
          <span className="text-aura-muted"> / 5</span>
        </p>
      </div>
      <p className="text-xs text-aura-muted">
        {lowLabel} → {highLabel}
      </p>
      <div className="flex gap-1.5" role="group" aria-label={`${label}, 1 to 5`}>
        {steps.map((step) => (
          <button
            key={step}
            type="button"
            disabled={disabled}
            onClick={() => onChange(step)}
            aria-pressed={value === step}
            className={`min-h-11 min-w-0 flex-1 rounded-lg border text-sm font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed ${
              value === step
                ? "border-violet-500 bg-violet-600 text-white"
                : "border-aura-border bg-white text-aura-text hover:border-violet-300"
            }`}
          >
            {step}
          </button>
        ))}
      </div>
    </div>
  );
}

function getLocalMonthDayLabel(dateIso: string) {
  const date = new Date(dateIso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getMonthLabel(monthDate: Date) {
  return monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function toDateKey(date: Date) {
  return getLocalEntryDate(date);
}

function buildCalendarGrid(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ date: Date; inCurrentMonth: boolean; key: string }> = [];
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  for (let index = 0; index < totalCells; index += 1) {
    const dayNumber = index - firstWeekday + 1;
    const cellDate = new Date(year, month, dayNumber);
    const inCurrentMonth = cellDate.getMonth() === month;
    cells.push({ date: cellDate, inCurrentMonth, key: toDateKey(cellDate) });
  }

  return cells;
}

function readLocalEntries(): MoodEntry[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  const parsed = JSON.parse(raw) as MoodEntry[];
  return parsed.map((entry) => ({
    ...entry,
    emotionLevel: normalizeLevel(entry.emotionLevel),
    stressLevel: normalizeLevel(entry.stressLevel),
    energyLevel: normalizeLevel(entry.energyLevel)
  }));
}

function persistLocalEntries(entries: MoodEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function recentRangeKeys(): { start: string; end: string } {
  const end = getLocalEntryDate(new Date());
  const startD = new Date();
  startD.setDate(startD.getDate() - 20);
  const start = getLocalEntryDate(startD);
  return { start, end };
}

export function MoodTracker() {
  const supabaseEnabled = useMemo(() => canUseSupabase(), []);
  const [selectedMood, setSelectedMood] = useState<MoodKey | null>(null);
  const [emotionLevel, setEmotionLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [energyLevel, setEnergyLevel] = useState(3);
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [insightEntries, setInsightEntries] = useState<MoodEntry[]>([]);
  const [insightRefreshKey, setInsightRefreshKey] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [autosaveMessage, setAutosaveMessage] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

  const lastSavedFingerprint = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadEntries() {
      setIsHistoryLoading(true);
      setHistoryError(null);

      try {
        if (supabaseEnabled) {
          const monthEntries = await listMoodEntriesByMonth(viewDate.getFullYear(), viewDate.getMonth() + 1);
          setEntries(monthEntries);
        } else {
          const localEntries = readLocalEntries();
          const monthEntries = localEntries.filter((entry) => {
            const date = new Date(`${entry.entryDate}T00:00:00`);
            return date.getMonth() === viewDate.getMonth() && date.getFullYear() === viewDate.getFullYear();
          });
          setEntries(monthEntries);
        }
      } catch (error) {
        setHistoryError("Could not load mood history.");
        console.error("Failed loading mood entries", error);
      } finally {
        setIsHistoryLoading(false);
      }
    }

    void loadEntries();
  }, [supabaseEnabled, viewDate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { start, end } = recentRangeKeys();
      try {
        let rows: MoodEntry[];
        if (supabaseEnabled) {
          rows = await listMoodEntriesBetween(start, end);
        } else {
          rows = readLocalEntries().filter((e) => e.entryDate >= start && e.entryDate <= end);
        }
        if (!cancelled) {
          setInsightEntries(rows);
        }
      } catch (error) {
        console.error("Failed loading insight window", error);
        if (!cancelled) {
          setInsightEntries([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseEnabled, insightRefreshKey]);

  const selectedMoodMeta = useMemo(
    () => (selectedMood ? getMoodOption(selectedMood) : undefined),
    [selectedMood]
  );

  const entriesByDate = useMemo(() => {
    return entries.reduce<Record<string, MoodEntry[]>>((map, entry) => {
      if (!map[entry.entryDate]) {
        map[entry.entryDate] = [];
      }
      map[entry.entryDate].push(entry);
      return map;
    }, {});
  }, [entries]);

  const calendarCells = useMemo(() => buildCalendarGrid(viewDate), [viewDate]);
  const selectedDayEntries = entriesByDate[selectedDateKey] ?? [];
  const insights = useMemo(() => generateInsights(insightEntries), [insightEntries]);

  const performSave = useCallback(
    async (expectedFingerprint: string) => {
      if (!selectedMood) {
        return;
      }
      const entryDate = getLocalEntryDate(new Date());
      const trimmedNote = note.trim().slice(0, NOTE_MAX_LENGTH) || undefined;

      setAutosaveStatus("saving");
      setAutosaveMessage(null);

      try {
        if (supabaseEnabled) {
          const newEntry = await createMoodEntry({
            entryDate,
            mood: selectedMood,
            emotionLevel,
            stressLevel,
            energyLevel,
            note: trimmedNote
          });
          setEntries((previous) => {
            const inMonth =
              new Date(`${newEntry.entryDate}T00:00:00`).getMonth() === viewDate.getMonth() &&
              new Date(`${newEntry.entryDate}T00:00:00`).getFullYear() === viewDate.getFullYear();
            return inMonth ? [newEntry, ...previous] : previous;
          });
        } else {
          const newEntry: MoodEntry = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            entryDate,
            mood: selectedMood,
            emotionLevel,
            stressLevel,
            energyLevel,
            source: "manual",
            note: trimmedNote ?? null
          };
          const allLocalEntries = [newEntry, ...readLocalEntries()];
          persistLocalEntries(allLocalEntries);
          setEntries((previous) => {
            const inMonth =
              new Date(`${newEntry.entryDate}T00:00:00`).getMonth() === viewDate.getMonth() &&
              new Date(`${newEntry.entryDate}T00:00:00`).getFullYear() === viewDate.getFullYear();
            return inMonth ? [newEntry, ...previous] : previous;
          });
        }

        setSelectedDateKey(entryDate);
        setInsightRefreshKey((k) => k + 1);
        lastSavedFingerprint.current = expectedFingerprint;
        setAutosaveStatus("saved");
        setAutosaveMessage("Saved to Rediscover Aura.");
        window.setTimeout(() => {
          setAutosaveStatus((s) => (s === "saved" ? "idle" : s));
          setAutosaveMessage(null);
        }, 2500);
      } catch (error) {
        console.error("Failed saving mood", error);
        setAutosaveStatus("error");
        setAutosaveMessage("Could not save. Check your connection and try again.");
        throw error;
      }
    },
    [selectedMood, emotionLevel, stressLevel, energyLevel, note, supabaseEnabled, viewDate]
  );

  useEffect(() => {
    if (!selectedMood) {
      return;
    }
    const fingerprint = `${selectedMood}|${emotionLevel}|${stressLevel}|${energyLevel}|${note.trim()}`;
    if (fingerprint === lastSavedFingerprint.current) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void performSave(fingerprint).catch(() => {
        /* error state already set in performSave */
      });
    }, AUTOSAVE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [selectedMood, emotionLevel, stressLevel, energyLevel, note, performSave]);

  function goToToday() {
    const now = new Date();
    setViewDate(now);
    setSelectedDateKey(toDateKey(now));
  }

  function onSelectMood(mood: MoodKey) {
    const moodMeta = getMoodOption(mood);
    if (!moodMeta) {
      return;
    }
    setSelectedMood(mood);
    setEmotionLevel(moodMeta.defaults.emotion);
    setStressLevel(moodMeta.defaults.stress);
    setEnergyLevel(moodMeta.defaults.energy);
    setNote("");
    lastSavedFingerprint.current = null;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(120%_120%_at_0%_0%,#f2ebff_0%,#f8f7f4_50%,#f9f8f5_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <section className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1.45fr_1fr]">
        <article className="rounded-[28px] border border-aura-border/80 bg-aura-card p-6 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.35)] sm:p-8">
          {!supabaseEnabled ? (
            <p className="mb-5 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              Supabase is not configured. Running in local fallback mode.
            </p>
          ) : null}

          <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-aura-text sm:text-4xl">
                How are you feeling today?
              </h1>
              <p className="mt-2 text-sm leading-6 text-aura-muted sm:text-base">
                Pick a mood and Rediscover Aura pre-fills a 1–5 baseline for each line so logging stays quick. Your check-in
                saves automatically after you stop editing for a moment.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowInsights(true)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-aura-border bg-white p-2.5 text-aura-muted transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                aria-label="Open predictive insights"
              >
                <Lightbulb size={20} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => {
                  goToToday();
                  setShowHistory(true);
                }}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-aura-border bg-white p-2.5 text-aura-muted transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                aria-label="Open monthly history for today"
              >
                <CalendarDays size={20} aria-hidden />
              </button>
            </div>
          </header>

          <div className="mb-8 grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3">
            {MOOD_OPTIONS.map((mood) => (
              <button
                type="button"
                key={mood.key}
                onClick={() => onSelectMood(mood.key)}
                className={`group rounded-2xl border p-3 text-center transition sm:p-4 ${
                  selectedMood === mood.key
                    ? "border-violet-300 bg-violet-50/95 shadow-[0_10px_20px_-20px_rgba(124,58,237,0.7)]"
                    : "border-aura-border bg-white hover:border-violet-200 hover:bg-violet-50/45"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500`}
                aria-label={mood.label}
              >
                <p className="text-3xl transition duration-300 group-hover:scale-110">{mood.emoji}</p>
                <p className="mt-1.5 text-xs font-medium text-aura-muted sm:text-sm">{mood.label}</p>
              </button>
            ))}
          </div>

          {selectedMood ? (
            <div className="space-y-8">
              <div className="space-y-6">
                <Scale1to5
                  label="Emotion"
                  lowLabel="Low"
                  highLabel="High"
                  value={emotionLevel}
                  onChange={setEmotionLevel}
                />
                <Scale1to5
                  label="Stress"
                  lowLabel="Calm"
                  highLabel="Intense"
                  value={stressLevel}
                  onChange={setStressLevel}
                />
                <Scale1to5
                  label="Energy"
                  lowLabel="Low"
                  highLabel="High"
                  value={energyLevel}
                  onChange={setEnergyLevel}
                />
              </div>

              <div>
                <label htmlFor="mood-note" className="text-sm font-medium text-aura-text">
                  Add a brief note{" "}
                  <span className="font-normal text-aura-muted">(optional) — what is behind this feeling today?</span>
                </label>
                <textarea
                  id="mood-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
                  rows={3}
                  maxLength={NOTE_MAX_LENGTH}
                  placeholder="e.g. Deadlines piling up at work…"
                  className="mt-2 w-full resize-y rounded-xl border border-aura-border bg-white px-3 py-2 text-sm text-aura-text placeholder:text-aura-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                />
                <p className="mt-1 text-xs text-aura-muted tabular-nums">
                  {note.length} / {NOTE_MAX_LENGTH}
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-aura-border bg-aura-canvas/80 px-4 py-6 text-center text-sm text-aura-muted">
              Select a mood above to set your 1–5 levels and optional note. Rediscover Aura will save your check-in
              automatically.
            </p>
          )}

          <div className="mt-8 flex min-h-11 flex-col gap-2 text-sm text-aura-muted sm:flex-row sm:items-center sm:justify-between">
            <div>
              {selectedMoodMeta ? (
                <span>
                  Selected mood: <span className="font-semibold text-aura-text">{selectedMoodMeta.label}</span>
                </span>
              ) : (
                <span>Select a mood to begin your check-in.</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-aura-text" aria-live="polite">
              {autosaveStatus === "saving" ? (
                <>
                  <Loader2 size={16} className="animate-spin text-violet-600" aria-hidden />
                  <span className="text-sm">Saving…</span>
                </>
              ) : null}
              {autosaveStatus === "saved" && autosaveMessage ? (
                <span className="text-sm font-medium text-emerald-700">{autosaveMessage}</span>
              ) : null}
              {autosaveStatus === "error" && autosaveMessage ? (
                <span className="text-sm font-medium text-red-700">{autosaveMessage}</span>
              ) : null}
              {selectedMood && autosaveStatus === "idle" ? (
                <span className="text-xs text-aura-muted sm:text-sm">Edits save automatically.</span>
              ) : null}
            </div>
          </div>
        </article>

        <aside className="rounded-[28px] border border-aura-border/80 bg-white/95 p-6 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.4)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                <Sparkles size={14} /> Insights
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-aura-text">Your trend snapshot</h2>
              <p className="mt-1 text-sm text-aura-muted">
                Based on your check-ins over the past {INSIGHT_WINDOW_DAYS} days in Rediscover Aura.
              </p>
            </div>
          </div>
          <ul className="mt-6 space-y-3">
            {insights.map((insight) => (
              <li key={insight} className="rounded-2xl border border-aura-border bg-aura-canvas px-4 py-3 text-sm leading-6 text-aura-text">
                {insight}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-aura-border bg-white px-4 py-2.5 text-sm font-medium text-aura-text transition hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <CalendarDays size={16} />
            Open Monthly History
          </button>
        </aside>
      </section>

      {showHistory ? (
        <div className="fixed inset-0 z-20 bg-black/30 p-4 sm:p-8">
          <section className="mx-auto grid h-full w-full max-w-5xl gap-4 rounded-3xl border border-aura-border bg-white p-4 shadow-2xl sm:grid-cols-[1.35fr_1fr] sm:p-6">
            <div className="min-h-0">
              <header className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-aura-text">Monthly History</h3>
                  <p className="text-sm text-aura-muted">{getMonthLabel(viewDate)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-aura-border p-2 text-aura-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  aria-label="Close history"
                >
                  <X size={18} aria-hidden />
                </button>
              </header>

              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewDate((previous) => new Date(previous.getFullYear(), previous.getMonth() - 1, 1))}
                  className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-aura-border px-3 py-2 text-sm text-aura-text hover:border-violet-300"
                >
                  <ChevronLeft size={16} aria-hidden />
                  Prev
                </button>
                <button
                  type="button"
                  onClick={goToToday}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-aura-border px-3 py-2 text-sm text-aura-text hover:border-violet-300"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setViewDate((previous) => new Date(previous.getFullYear(), previous.getMonth() + 1, 1))}
                  className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-aura-border px-3 py-2 text-sm text-aura-text hover:border-violet-300"
                >
                  Next
                  <ChevronRight size={16} aria-hidden />
                </button>
              </div>

              {isHistoryLoading ? (
                <div className="flex h-44 items-center justify-center text-sm text-aura-muted">
                  <Loader2 size={16} className="mr-2 animate-spin" /> Loading history...
                </div>
              ) : null}
              {historyError ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{historyError}</p> : null}

              {!isHistoryLoading && !historyError ? (
                <>
                  <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-aura-muted">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <p key={day} className="py-1">
                        {day}
                      </p>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarCells.map((cell) => {
                      const dayEntries = entriesByDate[cell.key] ?? [];
                      const isSelected = selectedDateKey === cell.key;
                      return (
                        <button
                          type="button"
                          key={cell.key}
                          onClick={() => setSelectedDateKey(cell.key)}
                          className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border p-1.5 text-center transition ${
                            isSelected
                              ? "border-violet-400 bg-violet-50"
                              : "border-aura-border bg-white hover:border-violet-200"
                          } ${cell.inCurrentMonth ? "text-aura-text" : "text-aura-muted/50"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500`}
                        >
                          <span className="text-xs font-semibold tabular-nums">{cell.date.getDate()}</span>
                          {dayEntries.length > 0 ? (
                            <span className="block text-[10px] font-medium leading-tight text-violet-700">
                              {dayEntries.length} log{dayEntries.length > 1 ? "s" : ""}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>

            <div className="min-h-0 rounded-2xl bg-aura-canvas p-4">
              <h4 className="text-base font-semibold text-aura-text">Selected day</h4>
              <p className="mb-3 text-sm text-aura-muted">{selectedDateKey}</p>
              <div className="max-h-[56vh] space-y-2 overflow-y-auto pr-1">
                {selectedDayEntries.length > 0 ? (
                  selectedDayEntries.map((entry) => {
                    const moodMeta = getMoodOption(entry.mood);
                    return (
                      <article key={entry.id} className="rounded-xl border border-aura-border bg-white p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-aura-text">
                            {moodMeta?.emoji} {moodMeta?.label}
                          </p>
                          <p className="text-xs text-aura-muted whitespace-nowrap">{getLocalMonthDayLabel(entry.createdAt)}</p>
                        </div>
                        <p className="text-xs text-aura-muted">
                          Emotion {normalizeLevel(entry.emotionLevel)} · Stress {normalizeLevel(entry.stressLevel)} · Energy{" "}
                          {normalizeLevel(entry.energyLevel)}
                          <span className="text-aura-muted"> (1–5)</span>
                        </p>
                        {entry.note ? (
                          <p className="mt-2 border-t border-aura-border pt-2 text-sm leading-relaxed text-aura-text">
                            {entry.note}
                          </p>
                        ) : null}
                      </article>
                    );
                  })
                ) : (
                  <p className="rounded-xl border border-dashed border-aura-border bg-white p-4 text-sm text-aura-muted">
                    No logs on this day yet.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {showInsights ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/30 p-4">
          <section className="w-full max-w-xl rounded-3xl border border-aura-border bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-aura-text">Predictive Insights</h2>
              <button
                type="button"
                onClick={() => setShowInsights(false)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-aura-border p-2 text-aura-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                aria-label="Close insights"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <p className="mb-4 text-sm text-aura-muted">
              Framed from your last {INSIGHT_WINDOW_DAYS} days of check-ins in Rediscover Aura.
            </p>
            <ul className="space-y-3">
              {insights.map((insight) => (
                <li key={insight} className="rounded-xl border border-aura-border bg-aura-canvas p-3 text-sm leading-6 text-aura-text">
                  {insight}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </main>
  );
}
