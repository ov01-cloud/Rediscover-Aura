import type { OwnerTag } from "@/lib/mood-config";

export const OWNER_DEFAULT = "default" as const;
export const TEST_USER_A = "test_user_a" as const;
export const TEST_USER_B = "test_user_b" as const;

export const OWNER_OPTIONS: { value: OwnerTag; label: string }[] = [
  { value: "default", label: "Primary (you)" },
  { value: "test_user_a", label: "Test user A" },
  { value: "test_user_b", label: "Test user B" }
];

const STORAGE_KEY = "rediscover-aura:owner-tag";

function isValidOwner(v: string): v is OwnerTag {
  return v === "default" || v === "test_user_a" || v === "test_user_b";
}

export function getStoredOwnerTag(): OwnerTag {
  if (typeof window === "undefined") {
    return "default";
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw && isValidOwner(raw)) {
    return raw;
  }
  return "default";
}

export function setStoredOwnerTag(tag: OwnerTag) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(STORAGE_KEY, tag);
}

export function isDataReviewEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_DATA_REVIEW === "true";
}
