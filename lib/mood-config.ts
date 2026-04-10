export type MoodKey = "happy" | "neutral" | "sad" | "angry" | "anxious";

export type MoodEntry = {
  id: string;
  createdAt: string;
  entryDate: string;
  mood: MoodKey;
  emotionLevel: number;
  stressLevel: number;
  energyLevel: number;
  source: "manual";
  note?: string | null;
};

export const MOOD_OPTIONS: Array<{
  key: MoodKey;
  label: string;
  emoji: string;
  defaults: { emotion: number; stress: number; energy: number };
}> = [
  { key: "happy", label: "Happy", emoji: "😊", defaults: { emotion: 90, stress: 20, energy: 78 } },
  { key: "neutral", label: "Neutral", emoji: "🙂", defaults: { emotion: 55, stress: 40, energy: 52 } },
  { key: "sad", label: "Sad", emoji: "😔", defaults: { emotion: 25, stress: 55, energy: 28 } },
  { key: "angry", label: "Angry", emoji: "😠", defaults: { emotion: 32, stress: 85, energy: 66 } },
  { key: "anxious", label: "Anxious", emoji: "😰", defaults: { emotion: 36, stress: 88, energy: 44 } }
];

export function getMoodOption(moodKey: MoodKey) {
  return MOOD_OPTIONS.find((mood) => mood.key === moodKey);
}

export function getLocalEntryDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
