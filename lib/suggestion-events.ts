import type { OwnerTag } from "@/lib/mood-config";
import { canUseSupabase, getSupabaseClient } from "@/lib/supabase-client";

const LOCAL_KEY = "rediscover-aura:suggestion-events";
const LOCAL_MAX = 500;

export type SuggestionEventType = "shown" | "acted";

export type SuggestionEventRow = {
  id: string;
  createdAt: string;
  ownerTag: OwnerTag;
  moodEntryId: string | null;
  suggestionKey: string;
  event: SuggestionEventType;
};

type LocalStoredEvent = {
  id: string;
  createdAt: string;
  ownerTag: OwnerTag;
  moodEntryId: string | null;
  suggestionKey: string;
  event: SuggestionEventType;
};

function readLocalEvents(): LocalStoredEvent[] {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as LocalStoredEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendLocalEvent(row: LocalStoredEvent) {
  const next = [row, ...readLocalEvents()].slice(0, LOCAL_MAX);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
}

/**
 * Append-only analytics: suggestion surfaced vs. user-reported follow-through.
 * Works with Supabase when configured; otherwise stores in localStorage.
 */
export async function logSuggestionEvent(input: {
  ownerTag: OwnerTag;
  moodEntryId: string | null;
  suggestionKey: string;
  event: SuggestionEventType;
}): Promise<void> {
  if (!input.suggestionKey.trim()) {
    return;
  }

  if (canUseSupabase()) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("suggestion_events").insert({
      owner_tag: input.ownerTag,
      mood_entry_id: input.moodEntryId,
      suggestion_key: input.suggestionKey,
      event: input.event
    });
    if (error) {
      console.error("logSuggestionEvent", error.message);
    }
    return;
  }

  const row: LocalStoredEvent = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ownerTag: input.ownerTag,
    moodEntryId: input.moodEntryId,
    suggestionKey: input.suggestionKey,
    event: input.event
  };
  appendLocalEvent(row);
}
