"use client";

export function readPageCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.error(`Failed to read cache for ${key}:`, error);
    return null;
  }
}

export function writePageCache<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write cache for ${key}:`, error);
  }
}

export function clearPageCache(key: string) {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to clear cache for ${key}:`, error);
  }
}
