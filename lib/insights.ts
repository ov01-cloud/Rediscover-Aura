import { MoodEntry } from "@/lib/mood-config";
import { normalizeLevel } from "@/lib/level-scale";

export const INSIGHT_WINDOW_DAYS = 5;

export type InsightCard = {
  /** Stable id for list keys in React */
  id: string;
  /** Text shown in the UI */
  text: string;
  /**
   * When set, the app logs suggestion analytics (shown when insights open;
   * acted when the user confirms they tried the suggestion).
   */
  trackingKey?: string;
};

function entriesWithinLastDays(entries: MoodEntry[], days: number): MoodEntry[] {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  return entries.filter((e) => e.entryDate >= cutoffKey);
}

const FALLBACK_CARDS: InsightCard[] = [
  {
    id: "fallback-empty",
    text: "Over the past 5 days, you do not have check-ins yet. Log a mood in Rediscover Aura to unlock patterns tailored to you."
  },
  {
    id: "fallback-journal",
    text: "When you are ready, a short journaling prompt in Rediscover Aura can help you name what is behind a stressful day.",
    trackingKey: "journal_onboarding"
  },
  {
    id: "fallback-consistency",
    text: "Consistency matters: even one daily check-in over five days gives a clearer picture for gentle guidance."
  }
];

export function generateInsightCards(allEntries: MoodEntry[]): InsightCard[] {
  const windowed = entriesWithinLastDays(allEntries, INSIGHT_WINDOW_DAYS);
  const prefix = `Over the past ${INSIGHT_WINDOW_DAYS} days`;

  if (windowed.length === 0) {
    return FALLBACK_CARDS;
  }

  const avgStress =
    windowed.reduce((sum, entry) => sum + normalizeLevel(entry.stressLevel), 0) / windowed.length;
  const avgEnergy =
    windowed.reduce((sum, entry) => sum + normalizeLevel(entry.energyLevel), 0) / windowed.length;
  const anxiousCount = windowed.filter((entry) => entry.mood === "anxious").length;

  const cards: InsightCard[] = [];

  if (avgStress >= 4) {
    cards.push({
      id: "stress-high",
      text: `${prefix}, your stress levels have often run high. A five-minute reset in Rediscover Aura before your busiest stretch may help; later we can tie this to guided journaling when that module ships.`,
      trackingKey: "journal_stress_high"
    });
  } else {
    cards.push({
      id: "stress-steady",
      text: `${prefix}, your stress pattern looks steadier. Keeping a light daily rhythm in Rediscover Aura will make trends easier to spot over time.`
    });
  }

  if (avgEnergy <= 2) {
    cards.push({
      id: "energy-low",
      text: `${prefix}, energy has often been on the lower side. A short walk or daylight break is a simple next step; down the road, Rediscover Aura can suggest experiences and retreats that match this pattern.`
    });
  } else {
    cards.push({
      id: "energy-ok",
      text: `${prefix}, your energy has held up fairly well. Protecting sleep and movement will support what is already working.`
    });
  }

  if (anxiousCount >= 2) {
    cards.push({
      id: "anxiety-repeat",
      text: `${prefix}, anxious moods showed up more than once. Naming triggers in a future journaling flow in Rediscover Aura will pair well with this tracker—when the platform expands, we can route you there from insights like this one.`,
      trackingKey: "journal_anxiety_pattern"
    });
  } else {
    cards.push({
      id: "anxiety-ok",
      text: `${prefix}, mood variety looks manageable. Small, regular check-ins build the clearest picture for personalized nudges as Rediscover Aura grows.`
    });
  }

  return cards;
}
