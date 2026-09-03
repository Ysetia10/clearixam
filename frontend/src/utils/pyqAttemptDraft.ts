import type { SectionCode } from './pyqTestState';

const STORAGE_PREFIX = 'clearixam.pyq.draft.v1:';

export type PyqAttemptDraft = {
  version: 1;
  paperId: string;
  attemptId: string;
  userEmail: string | null;
  testStarted: boolean;
  answers: Record<string, string>;
  visited: number[];
  marked: number[];
  index: number;
  paletteSection: SectionCode;
  /** Absolute end timestamp while timer is running. */
  endsAtMs: number | null;
  /** Remaining seconds while paused. */
  pausedRemainingSeconds: number | null;
  paused: boolean;
  durationMinutes: number;
  savedAt: number;
};

function storageKey(paperId: string, userEmail: string | null): string {
  return `${STORAGE_PREFIX}${userEmail || 'anon'}:${paperId}`;
}

export function loadPyqDraft(paperId: string, userEmail: string | null): PyqAttemptDraft | null {
  try {
    const raw = localStorage.getItem(storageKey(paperId, userEmail));
    if (!raw) return null;
    const draft = JSON.parse(raw) as PyqAttemptDraft;
    if (!draft || draft.version !== 1 || draft.paperId !== paperId) return null;
    if (draft.userEmail && userEmail && draft.userEmail !== userEmail) return null;
    return draft;
  } catch {
    return null;
  }
}

export function savePyqDraft(draft: PyqAttemptDraft): void {
  try {
    localStorage.setItem(storageKey(draft.paperId, draft.userEmail), JSON.stringify(draft));
  } catch {
    // Ignore quota / private mode failures.
  }
}

export function clearPyqDraft(paperId: string, userEmail: string | null): void {
  try {
    localStorage.removeItem(storageKey(paperId, userEmail));
  } catch {
    // ignore
  }
}

/** Remaining seconds implied by a draft at "now". */
export function remainingFromDraft(draft: PyqAttemptDraft, now = Date.now()): number | null {
  if (!draft.testStarted) return draft.durationMinutes * 60;
  if (draft.paused) {
    return Math.max(0, draft.pausedRemainingSeconds ?? 0);
  }
  if (draft.endsAtMs == null) return draft.durationMinutes * 60;
  return Math.max(0, Math.ceil((draft.endsAtMs - now) / 1000));
}

/** Drop drafts that finished long ago (no useful resume). */
export function isDraftResumable(draft: PyqAttemptDraft, now = Date.now()): boolean {
  if (!draft.testStarted) return true;
  const left = remainingFromDraft(draft, now);
  if (left == null) return false;
  // Allow resume with 0 so we can auto-submit with saved answers.
  if (draft.paused) return true;
  // If timer already expired more than 2 minutes ago and no answers, skip.
  if (left === 0 && Object.keys(draft.answers).length === 0) return false;
  return true;
}
