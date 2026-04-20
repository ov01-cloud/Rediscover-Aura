import { assertLevel1to5, normalizeLevel } from "@/lib/level-scale";
import { MoodEntry, MoodKey } from "@/lib/mood-config";
import { getSupabaseClient } from "@/lib/supabase-client";

type MoodEntryRow = {
  id: string;
  created_at: string;
  entry_date: string;
  mood: MoodKey;
  emotion_level: number;
  stress_level: number;
  energy_level: number;
  source: "manual";
  note: string | null;
};

export type CreateMoodEntryInput = {
  entryDate: string;
  mood: MoodKey;
  emotionLevel: number;
  stressLevel: number;
  energyLevel: number;
  note?: string;
};

const TABLE_NAME = "mood_entries";

function toDomain(row: MoodEntryRow): MoodEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    entryDate: row.entry_date,
    mood: row.mood,
    emotionLevel: normalizeLevel(row.emotion_level),
    stressLevel: normalizeLevel(row.stress_level),
    energyLevel: normalizeLevel(row.energy_level),
    source: row.source,
    note: row.note
  };
}

export async function createMoodEntry(input: CreateMoodEntryInput): Promise<MoodEntry> {
  assertLevel1to5(input.emotionLevel, "Emotion");
  assertLevel1to5(input.stressLevel, "Stress");
  assertLevel1to5(input.energyLevel, "Energy");

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      entry_date: input.entryDate,
      mood: input.mood,
      emotion_level: input.emotionLevel,
      stress_level: input.stressLevel,
      energy_level: input.energyLevel,
      note: input.note ?? null,
      source: "manual"
    })
    .select("*")
    .single<MoodEntryRow>();

  if (error) {
    throw new Error(error.message);
  }
  return toDomain(data);
}

export async function listMoodEntriesByMonth(year: number, monthOneIndexed: number): Promise<MoodEntry[]> {
  const monthStart = `${year}-${String(monthOneIndexed).padStart(2, "0")}-01`;
  const monthEndDate = new Date(year, monthOneIndexed, 0);
  const monthEnd = `${year}-${String(monthOneIndexed).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .gte("entry_date", monthStart)
    .lte("entry_date", monthEnd)
    .order("created_at", { ascending: false })
    .returns<MoodEntryRow[]>();

  if (error) {
    throw new Error(error.message);
  }
  return data.map(toDomain);
}

export async function listMoodEntriesBetween(startDate: string, endDate: string): Promise<MoodEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .gte("entry_date", startDate)
    .lte("entry_date", endDate)
    .order("created_at", { ascending: false })
    .returns<MoodEntryRow[]>();

  if (error) {
    throw new Error(error.message);
  }
  return data.map(toDomain);
}
