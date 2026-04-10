"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Lightbulb, Loader2, Save, Sparkles, X } from "lucide-react";
import { generateInsights } from "@/lib/insights";
import { createMoodEntry, listMoodEntriesByMonth } from "@/lib/mood-entries";
import { getLocalEntryDate, getMoodOption, MoodEntry, MoodKey, MOOD_OPTIONS } from "@/lib/mood-config";
import { canUseSupabase } from "@/lib/supabase-client";

const STORAGE_KEY = "rediscover-aura:mood-entries";

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-aura-text">{label}</p>
        <p className="text-sm text-aura-muted">{value}%</p>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-aura-accentSoft/90">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-700 ease-out"
          style={{ width: `${value}%` }}
        />
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
  return JSON.parse(raw) as MoodEntry[];
}

function persistLocalEntries(entries: MoodEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function MoodTracker() {
  const supabaseEnabled = useMemo(() => canUseSupabase(), []);
  const [selectedMood, setSelectedMood] = useState<MoodKey | null>(null);
  const [emotionLevel, setEmotionLevel] = useState(0);
  const [stressLevel, setStressLevel] = useState(0);
  const [energyLevel, setEnergyLevel] = useState(0);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

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
  const insights = useMemo(() => generateInsights(entries), [entries]);

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
  }

  async function onSaveMood() {
    if (!selectedMood) {
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    const entryDate = getLocalEntryDate(new Date());

    try {
      if (supabaseEnabled) {
        const newEntry = await createMoodEntry({
          entryDate,
          mood: selectedMood,
          emotionLevel,
          stressLevel,
          energyLevel
        });
        setEntries((previous) => [newEntry, ...previous]);
      } else {
        const newEntry: MoodEntry = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          entryDate,
          mood: selectedMood,
          emotionLevel,
          stressLevel,
          energyLevel,
          source: "manual"
        };
        const allLocalEntries = [newEntry, ...readLocalEntries()];
        persistLocalEntries(allLocalEntries);
        setEntries((previous) => [newEntry, ...previous]);
      }

      setSelectedDateKey(entryDate);
      setSaveMessage("Mood logged successfully.");
    } catch (error) {
      console.error("Failed saving mood", error);
      setSaveError("Could not save mood log. Please try again.");
    } finally {
      setIsSaving(false);
    }
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
                Pick a mood and Aura pre-fills your emotional baseline so logging takes just a few seconds.
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

          <div className="space-y-6">
            <MetricBar label="Emotion" value={emotionLevel} />
            <MetricBar label="Stress" value={stressLevel} />
            <MetricBar label="Energy" value={energyLevel} />
          </div>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-aura-muted">
              {selectedMoodMeta ? (
                <span>
                  Selected mood: <span className="font-semibold text-aura-text">{selectedMoodMeta.label}</span>
                </span>
              ) : (
                <span>Select a mood to prepare your log entry.</span>
              )}
              {saveMessage ? <p className="mt-1 text-sm text-emerald-700">{saveMessage}</p> : null}
              {saveError ? <p className="mt-1 text-sm text-red-700">{saveError}</p> : null}
            </div>
              <button
                type="button"
                disabled={!selectedMood || isSaving}
                onClick={onSaveMood}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-aura-text px-5 py-3 text-sm font-medium text-white transition hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Logging...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Mood Log
                </>
              )}
            </button>
          </div>
        </article>

        <aside className="rounded-[28px] border border-aura-border/80 bg-white/95 p-6 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.4)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                <Sparkles size={14} /> Insights
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-aura-text">Your trend snapshot</h2>
              <p className="mt-1 text-sm text-aura-muted">Simple guidance from your latest check-ins.</p>
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
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-aura-text">
                            {moodMeta?.emoji} {moodMeta?.label}
                          </p>
                          <p className="text-xs text-aura-muted">{getLocalMonthDayLabel(entry.createdAt)}</p>
                        </div>
                        <p className="text-xs text-aura-muted">
                          Emotion {entry.emotionLevel} · Stress {entry.stressLevel} · Energy {entry.energyLevel}
                        </p>
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
