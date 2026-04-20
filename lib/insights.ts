import { MoodEntry } from "@/lib/mood-config";
import { normalizeLevel } from "@/lib/level-scale";

export const INSIGHT_WINDOW_DAYS = 5;

function entriesWithinLastDays(entries: MoodEntry[], days: number): MoodEntry[] {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  return entries.filter((e) => e.entryDate >= cutoffKey);
}

const FALLBACK_INSIGHTS: string[] = [
  "Over the past 5 days, you do not have check-ins yet. Log a mood in Rediscover Aura to unlock patterns tailored to you.",
  "When you are ready, a short journaling prompt in Rediscover Aura can help you name what is behind a stressful day.",
  "Consistency matters: even one daily check-in over five days gives a clearer picture for gentle guidance."
];

export function generateInsights(allEntries: MoodEntry[]): string[] {
  const windowed = entriesWithinLastDays(allEntries, INSIGHT_WINDOW_DAYS);
  const prefix = `Over the past ${INSIGHT_WINDOW_DAYS} days`;

  if (windowed.length === 0) {
    return FALLBACK_INSIGHTS;
  }

  const avgStress =
    windowed.reduce((sum, entry) => sum + normalizeLevel(entry.stressLevel), 0) / windowed.length;
  const avgEnergy =
    windowed.reduce((sum, entry) => sum + normalizeLevel(entry.energyLevel), 0) / windowed.length;
  const anxiousCount = windowed.filter((entry) => entry.mood === "anxious").length;

  const insights: string[] = [];

  if (avgStress >= 4) {
    insights.push(
      `${prefix}, your stress levels have often run high. A five-minute reset in Rediscover Aura before your busiest stretch may help; later we can tie this to guided journaling when that module ships.`
    );
  } else {
    insights.push(
      `${prefix}, your stress pattern looks steadier. Keeping a light daily rhythm in Rediscover Aura will make trends easier to spot over time.`
    );
  }

  if (avgEnergy <= 2) {
    insights.push(
      `${prefix}, energy has often been on the lower side. A short walk or daylight break is a simple next step; down the road, Rediscover Aura can suggest experiences and retreats that match this pattern.`
    );
  } else {
    insights.push(
      `${prefix}, your energy has held up fairly well. Protecting sleep and movement will support what is already working.`
    );
  }

  if (anxiousCount >= 2) {
    insights.push(
      `${prefix}, anxious moods showed up more than once. Naming triggers in a future journaling flow in Rediscover Aura will pair well with this tracker—when the platform expands, we can route you there from insights like this one.`
    );
  } else {
    insights.push(
      `${prefix}, mood variety looks manageable. Small, regular check-ins build the clearest picture for personalized nudges as Rediscover Aura grows.`
    );
  }

  return insights;
}
