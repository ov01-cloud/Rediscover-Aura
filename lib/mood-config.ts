export type MoodKey = "happy" | "neutral" | "sad" | "angry" | "anxious";

export type OwnerTag = "default" | "test_user_a" | "test_user_b";

export type MoodEntry = {
  id: string;
  createdAt: string;
  entryDate: string;
  ownerTag: OwnerTag;
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
  /** 1 = low / calm, 5 = high / intense — per dimension. */
  defaults: { emotion: number; stress: number; energy: number };
}> = [
  { key: "happy", label: "Happy", emoji: "😊", defaults: { emotion: 5, stress: 1, energy: 4 } },
  { key: "neutral", label: "Neutral", emoji: "🙂", defaults: { emotion: 3, stress: 3, energy: 3 } },
  { key: "sad", label: "Sad", emoji: "😔", defaults: { emotion: 1, stress: 3, energy: 2 } },
  { key: "angry", label: "Angry", emoji: "😠", defaults: { emotion: 2, stress: 5, energy: 4 } },
  { key: "anxious", label: "Anxious", emoji: "😰", defaults: { emotion: 2, stress: 5, energy: 3 } }
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
