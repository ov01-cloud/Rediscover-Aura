import { MoodEntry, OwnerTag } from "@/lib/mood-config";
import { normalizeLevel } from "@/lib/level-scale";

const STORAGE_KEY = "rediscover-aura:mood-entries";

function toOwner(x: string | null | undefined): OwnerTag {
  if (x === "test_user_a" || x === "test_user_b") {
    return x;
  }
  return "default";
}

export function readAllMoodEntriesFromLocal(): MoodEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  const parsed = JSON.parse(raw) as (MoodEntry & { ownerTag?: string })[];
  return parsed.map((entry) => ({
    ...entry,
    ownerTag: toOwner(entry.ownerTag as string | undefined),
    emotionLevel: normalizeLevel(entry.emotionLevel),
    stressLevel: normalizeLevel(entry.stressLevel),
    energyLevel: normalizeLevel(entry.energyLevel)
  }));
}

export function readMoodEntriesForOwner(owner: OwnerTag): MoodEntry[] {
  return readAllMoodEntriesFromLocal().filter((e) => e.ownerTag === owner);
}

function persistAll(entries: MoodEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function findLocalCheckInForDate(owner: OwnerTag, entryDate: string): MoodEntry | null {
  const list = readMoodEntriesForOwner(owner)
    .filter((e) => e.entryDate === entryDate)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list[0] ?? null;
}

export function upsertMoodEntryLocal(row: MoodEntry) {
  const all = readAllMoodEntriesFromLocal();
  const filtered = all.filter(
    (e) => !(e.entryDate === row.entryDate && e.ownerTag === row.ownerTag)
  );
  persistAll([row, ...filtered]);
}

export function listLocalMoodEntriesByMonth(
  owner: OwnerTag,
  year: number,
  month0: number
): MoodEntry[] {
  return readMoodEntriesForOwner(owner).filter((entry) => {
    const d = new Date(`${entry.entryDate}T00:00:00`);
    return d.getMonth() === month0 && d.getFullYear() === year;
  });
}

export function listLocalMoodEntriesBetween(
  owner: OwnerTag,
  start: string,
  end: string
): MoodEntry[] {
  return readMoodEntriesForOwner(owner).filter((e) => e.entryDate >= start && e.entryDate <= end);
}
