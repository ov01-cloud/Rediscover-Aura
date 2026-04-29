"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listMoodEntriesBetween } from "@/lib/mood-entries";
import { listLocalMoodEntriesBetween } from "@/lib/local-mood-store";
import { getLocalEntryDate, getMoodOption, type MoodEntry, type OwnerTag } from "@/lib/mood-config";
import { normalizeLevel } from "@/lib/level-scale";
import { OWNER_OPTIONS, getStoredOwnerTag, setStoredOwnerTag } from "@/lib/profile";
import { canUseSupabase } from "@/lib/supabase-client";

function sortEntries(rows: MoodEntry[]): MoodEntry[] {
  return [...rows].sort(
    (a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt)
  );
}

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 27);
  return { start: getLocalEntryDate(start), end: getLocalEntryDate(end) };
}

export function DataReviewView() {
  const supabaseEnabled = canUseSupabase();
  const initialRange = useMemo(() => defaultDateRange(), []);
  const [ownerTag, setOwnerTag] = useState<OwnerTag>("default");
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [rows, setRows] = useState<MoodEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setOwnerTag(getStoredOwnerTag());
  }, []);

  const load = useCallback(async () => {
    if (startDate > endDate) {
      setErrorMessage("Start date must be on or before end date.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMessage(null);
    try {
      if (supabaseEnabled) {
        const data = await listMoodEntriesBetween(ownerTag, startDate, endDate);
        setRows(sortEntries(data));
      } else {
        const data = listLocalMoodEntriesBetween(ownerTag, startDate, endDate);
        setRows(sortEntries(data));
      }
      setStatus("idle");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load entries.";
      setErrorMessage(message);
      setStatus("error");
    }
  }, [endDate, ownerTag, startDate, supabaseEnabled]);

  useEffect(() => {
    void load();
  }, [load]);

  function onOwnerChange(next: OwnerTag) {
    setOwnerTag(next);
    setStoredOwnerTag(next);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(120%_120%_at_0%_0%,#f2ebff_0%,#f8f7f4_50%,#f9f8f5_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-3 text-sm">
          <Link href="/" className="font-medium text-violet-700 underline">
            Back to check-in
          </Link>
        </p>
        <header className="mb-6 rounded-[28px] border border-aura-border/80 bg-aura-card p-6 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.35)] sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-aura-text sm:text-3xl">Data review</h1>
          <p className="mt-2 text-sm text-aura-muted sm:text-base">
            Scan mood entries for a profile and date range. Use the Supabase Table Editor for exports or ad hoc SQL; this view
            is a quick in-app readout.
          </p>
          {!supabaseEnabled ? (
            <p className="mt-3 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Supabase is not configured — showing browser-stored data only.
            </p>
          ) : null}
        </header>

        <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-aura-border/80 bg-white/95 p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 sm:w-56">
            <label className="text-xs font-semibold uppercase tracking-wide text-aura-muted" htmlFor="dr-profile">
              Profile
            </label>
            <select
              id="dr-profile"
              value={ownerTag}
              onChange={(e) => onOwnerChange(e.target.value as OwnerTag)}
              className="mt-1 w-full rounded-lg border border-aura-border bg-white px-3 py-2 text-sm text-aura-text"
            >
              {OWNER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-aura-muted" htmlFor="dr-start">
              From
            </label>
            <input
              id="dr-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full min-w-0 rounded-lg border border-aura-border bg-white px-3 py-2 text-sm text-aura-text"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-aura-muted" htmlFor="dr-end">
              To
            </label>
            <input
              id="dr-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full min-w-0 rounded-lg border border-aura-border bg-white px-3 py-2 text-sm text-aura-text"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={status === "loading"}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-aura-border bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-aura-border/80 bg-white shadow-[0_12px_40px_-32px_rgba(15,23,42,0.35)]">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-aura-border bg-aura-canvas">
                <th className="p-3 font-semibold text-aura-text">Date</th>
                <th className="p-3 font-semibold text-aura-text">Mood</th>
                <th className="p-3 font-semibold text-aura-text">E / S / En</th>
                <th className="p-3 font-semibold text-aura-text">Note</th>
                <th className="p-3 font-semibold text-aura-text">Row id</th>
              </tr>
            </thead>
            <tbody>
              {status === "loading" && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-aura-muted">
                    Loading…
                  </td>
                </tr>
              ) : null}
              {rows.length === 0 && status !== "loading" ? (
                <tr>
                  <td colSpan={5} className="p-6 text-aura-muted">
                    No entries in this range for this profile.
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => {
                const m = getMoodOption(r.mood);
                return (
                  <tr key={r.id} className="border-b border-aura-border/60">
                    <td className="p-3 align-top text-aura-text">{r.entryDate}</td>
                    <td className="p-3 align-top">
                      <span className="inline-flex items-center gap-1">
                        <span>{m?.emoji}</span>
                        <span className="text-aura-text">{m?.label}</span>
                      </span>
                    </td>
                    <td className="p-3 align-top tabular-nums text-aura-text">
                      {normalizeLevel(r.emotionLevel)} / {normalizeLevel(r.stressLevel)} / {normalizeLevel(r.energyLevel)}
                    </td>
                    <td className="max-w-md p-3 align-top text-aura-text">
                      {r.note ? <span className="line-clamp-3">{r.note}</span> : "—"}
                    </td>
                    <td className="p-3 align-top font-mono text-xs text-aura-muted">{r.id}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-aura-muted">
          Seeded <strong>Test user A</strong> and <strong>Test user B</strong> rows (when applied on Supabase) use the same 1–5
          scales. Primary profile is for live use.
        </p>
      </div>
    </main>
  );
}
