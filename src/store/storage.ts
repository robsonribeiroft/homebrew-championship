import { isValidState } from '../domain/tournament';
import type { TournamentState } from '../domain/types';

const NS = 'fifa-home-championship';
export const STATE_KEY = `${NS}:v1`;

export function readPref<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(`${NS}:${key}`);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readString(key: string): string | null {
  try {
    return localStorage.getItem(`${NS}:${key}`);
  } catch {
    return null;
  }
}

export function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(`${NS}:${key}`, value);
  } catch {
    /* armazenamento indisponível: segue sem persistir */
  }
}

export type LoadResult = { state: TournamentState | null; corrupted: boolean };

export function loadState(): LoadResult {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return { state: null, corrupted: false };
    const parsed: unknown = JSON.parse(raw);
    return isValidState(parsed) ? { state: parsed, corrupted: false } : { state: null, corrupted: true };
  } catch {
    return { state: null, corrupted: true };
  }
}

export function saveState(state: TournamentState): boolean {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
