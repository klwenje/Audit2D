const STUDY_PROGRESS_KEY = "audit-desk-retro-study-progress-v1";
const PRACTICE_REPLAY_KEY = "audit-desk-retro-practice-replay-v1";

export type CaseMasteryStats = {
  bestScore: number | null;
  timesPlayed: number;
  lastPlayedAt: string | null;
  lastMissedIssueIds: string[];
};

type StudyProgressStore = {
  version: 1;
  cases: Record<string, CaseMasteryStats>;
};

export type PracticeReplaySession = {
  caseId: string;
  focusIssueIds: string[];
  queuedAt: string;
};

function createDefaultCaseMasteryStats(): CaseMasteryStats {
  return {
    bestScore: null,
    timesPlayed: 0,
    lastPlayedAt: null,
    lastMissedIssueIds: [],
  };
}

function normalizeIssueIds(issueIds: string[]) {
  return Array.from(new Set(issueIds.filter(Boolean)));
}

function loadStudyProgressStore(): StudyProgressStore {
  if (typeof window === "undefined") {
    return { version: 1, cases: {} };
  }

  const raw = window.localStorage.getItem(STUDY_PROGRESS_KEY);
  if (!raw) {
    return { version: 1, cases: {} };
  }

  try {
    const parsed = JSON.parse(raw) as StudyProgressStore;
    if (parsed.version !== 1 || typeof parsed.cases !== "object" || parsed.cases === null) {
      return { version: 1, cases: {} };
    }

    return parsed;
  } catch {
    return { version: 1, cases: {} };
  }
}

function writeStudyProgressStore(store: StudyProgressStore) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STUDY_PROGRESS_KEY, JSON.stringify(store));
}

function loadPracticeReplayStore(): PracticeReplaySession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(PRACTICE_REPLAY_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PracticeReplaySession;
    if (
      typeof parsed.caseId !== "string" ||
      !Array.isArray(parsed.focusIssueIds) ||
      typeof parsed.queuedAt !== "string"
    ) {
      return null;
    }

    return {
      caseId: parsed.caseId,
      focusIssueIds: normalizeIssueIds(parsed.focusIssueIds),
      queuedAt: parsed.queuedAt,
    };
  } catch {
    return null;
  }
}

export function getCaseMasteryStats(caseId: string): CaseMasteryStats {
  const store = loadStudyProgressStore();
  return store.cases[caseId] ?? createDefaultCaseMasteryStats();
}

export function recordCaseStudyRun(caseId: string, score: number, missedIssueIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const store = loadStudyProgressStore();
  const currentStats = store.cases[caseId] ?? createDefaultCaseMasteryStats();
  const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0;

  store.cases[caseId] = {
    bestScore:
      currentStats.bestScore === null
        ? normalizedScore
        : Math.max(currentStats.bestScore, normalizedScore),
    timesPlayed: currentStats.timesPlayed + 1,
    lastPlayedAt: new Date().toISOString(),
    lastMissedIssueIds: normalizeIssueIds(missedIssueIds),
  };

  writeStudyProgressStore(store);
}

export function queuePracticeReplay(caseId: string, focusIssueIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  const session: PracticeReplaySession = {
    caseId,
    focusIssueIds: normalizeIssueIds(focusIssueIds),
    queuedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(PRACTICE_REPLAY_KEY, JSON.stringify(session));
}

export function loadPracticeReplay() {
  return loadPracticeReplayStore();
}

export function consumePracticeReplay() {
  const session = loadPracticeReplayStore();

  if (typeof window !== "undefined") {
    window.localStorage.removeItem(PRACTICE_REPLAY_KEY);
  }

  return session;
}

export function clearPracticeReplay() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PRACTICE_REPLAY_KEY);
}
