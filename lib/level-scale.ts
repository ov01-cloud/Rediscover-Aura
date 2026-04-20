/** Mood dimensions use a 1–5 scale (stored in DB). Legacy rows may still hold 0–100. */

export type Level1to5 = 1 | 2 | 3 | 4 | 5;

export function clampLevel1to5(value: number): Level1to5 {
  const rounded = Math.round(Number(value));
  if (rounded < 1) return 1;
  if (rounded > 5) return 5;
  return rounded as Level1to5;
}

/** Normalize legacy 0–100 or already 1–5 values for display and analytics. */
export function normalizeLevel(value: number): Level1to5 {
  if (Number.isFinite(value) && value >= 1 && value <= 5 && Number.isInteger(value)) {
    return value as Level1to5;
  }
  if (Number.isFinite(value) && value >= 0 && value <= 100) {
    const mapped = Math.round((value / 100) * 4) + 1;
    return clampLevel1to5(mapped);
  }
  return clampLevel1to5(value);
}

export function assertLevel1to5(level: number, label: string): Level1to5 {
  if (!Number.isFinite(level) || level < 1 || level > 5 || !Number.isInteger(level)) {
    throw new Error(`${label} must be a whole number from 1 to 5.`);
  }
  return level as Level1to5;
}
