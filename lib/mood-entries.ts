import { assertLevel1to5, normalizeLevel } from "@/lib/level-scale";
import { MoodEntry, MoodKey, OwnerTag } from "@/lib/mood-config";
import { getSupabaseClient } from "@/lib/supabase-client";

type MoodEntryRow = {
  id: string;
  created_at: string;
  entry_date: string;
  owner_tag: string | null;
  mood: MoodKey;
  emotion_level: number;
  stress_level: number;
  energy_level: number;
  source: "manual";
  note: string | null;
};

export type CreateMoodEntryInput = {
  entryDate: string;
  ownerTag: OwnerTag;
  mood: MoodKey;
  emotionLevel: number;
  stressLevel: number;
  energyLevel: number;
  note?: string;
};

const TABLE_NAME = "mood_entries";

function toDomain(row: MoodEntryRow): MoodEntry {
  const owner = row.owner_tag;
  const ownerTag: OwnerTag =
    owner === "test_user_a" || owner === "test_user_b" || owner === "default" || owner == null
      ? (owner as OwnerTag | null) ?? "default"
      : "default";

  return {
    id: row.id,
    createdAt: row.created_at,
    entryDate: row.entry_date,
    ownerTag,
    mood: row.mood,
    emotionLevel: normalizeLevel(row.emotion_level),
    stressLevel: normalizeLevel(row.stress_level),
    energyLevel: normalizeLevel(row.energy_level),
    source: row.source,
    note: row.note
  };
}

export type UpdateMoodEntryInput = {
  mood: MoodKey;
  emotionLevel: number;
  stressLevel: number;
  energyLevel: number;
  note?: string;
};

export async function createMoodEntry(input: CreateMoodEntryInput): Promise<MoodEntry> {
  assertLevel1to5(input.emotionLevel, "Emotion");
  assertLevel1to5(input.stressLevel, "Stress");
  assertLevel1to5(input.energyLevel, "Energy");

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      entry_date: input.entryDate,
      owner_tag: input.ownerTag,
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

export async function updateMoodEntry(id: string, input: UpdateMoodEntryInput): Promise<MoodEntry> {
  assertLevel1to5(input.emotionLevel, "Emotion");
  assertLevel1to5(input.stressLevel, "Stress");
  assertLevel1to5(input.energyLevel, "Energy");

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      mood: input.mood,
      emotion_level: input.emotionLevel,
      stress_level: input.stressLevel,
      energy_level: input.energyLevel,
      note: input.note ?? null
    })
    .eq("id", id)
    .select("*")
    .single<MoodEntryRow>();

  if (error) {
    throw new Error(error.message);
  }
  return toDomain(data);
}

export async function findCheckInForDate(
  ownerTag: OwnerTag,
  entryDate: string
): Promise<MoodEntry | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("owner_tag", ownerTag)
    .eq("entry_date", entryDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<MoodEntryRow[]>();

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.length === 0) {
    return null;
  }
  return toDomain(data[0]);
}

export async function listMoodEntriesByMonth(
  ownerTag: OwnerTag,
  year: number,
  monthOneIndexed: number
): Promise<MoodEntry[]> {
  const monthStart = `${year}-${String(monthOneIndexed).padStart(2, "0")}-01`;
  const monthEndDate = new Date(year, monthOneIndexed, 0);
  const monthEnd = `${year}-${String(monthOneIndexed).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("owner_tag", ownerTag)
    .gte("entry_date", monthStart)
    .lte("entry_date", monthEnd)
    .order("created_at", { ascending: false })
    .returns<MoodEntryRow[]>();

  if (error) {
    throw new Error(error.message);
  }
  return data.map(toDomain);
}

export async function listMoodEntriesBetween(
  ownerTag: OwnerTag,
  startDate: string,
  endDate: string
): Promise<MoodEntry[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("owner_tag", ownerTag)
    .gte("entry_date", startDate)
    .lte("entry_date", endDate)
    .order("created_at", { ascending: false })
    .returns<MoodEntryRow[]>();

  if (error) {
    throw new Error(error.message);
  }
  return data.map(toDomain);
}
