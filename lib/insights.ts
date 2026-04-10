import { MoodEntry } from "@/lib/mood-config";

const FALLBACK_INSIGHTS: string[] = [
  "Log moods for a few days to unlock personalized patterns.",
  "A short breathing break after lunch can improve focus and reduce stress.",
  "Consistency matters most. Even one daily check-in gives useful momentum."
];

export function generateInsights(entries: MoodEntry[]): string[] {
  if (entries.length === 0) {
    return FALLBACK_INSIGHTS;
  }

  const avgStress = Math.round(entries.reduce((sum, entry) => sum + entry.stressLevel, 0) / entries.length);
  const avgEnergy = Math.round(entries.reduce((sum, entry) => sum + entry.energyLevel, 0) / entries.length);
  const anxiousDays = entries.filter((entry) => entry.mood === "anxious").length;

  const insights: string[] = [];

  if (avgStress >= 65) {
    insights.push("Your recent stress trend is elevated. Try a 5-minute reset before your busiest part of the day.");
  } else {
    insights.push("Your stress trend is relatively stable. Keep your current rhythm and daily check-ins.");
  }

  if (avgEnergy < 50) {
    insights.push("Energy has been trending low. A short walk or sunlight break could improve your next check-in.");
  } else {
    insights.push("Energy is trending well. Protect the routines that support this momentum.");
  }

  if (anxiousDays >= 2) {
    insights.push("Anxious moods appear frequently this period. Consider a grounding cue at the same time each day.");
  } else {
    insights.push("Mood variance is manageable this period. Small, regular logs are reinforcing emotional awareness.");
  }

  return insights;
}
