import { normalizeRunDifficulty, type RunDifficulty } from "./runDifficulty";

const STUDY_PROGRESS_KEY = "audit-desk-retro-study-progress-v1";
const PRACTICE_REPLAY_KEY = "audit-desk-retro-practice-replay-v1";

export type CaseMasteryStats = {
  bestScore: number | null;
  timesPlayed: number;
  lastPlayedAt: string | null;
  lastMissedIssueIds: string[];
};

export type StudyMomentumSummary = {
  totalCases: number;
  casesTouched: number;
  totalRuns: number;
  averageBestScore: number | null;
  replayReadyCases: number;
  strongestCase: {
    caseId: string;
    bestScore: number;
  } | null;
  mostReplayedCase: {
    caseId: string;
    timesPlayed: number;
  } | null;
};

export type ProjectedStudyRun = {
  caseId: string;
  score: number;
  missedIssueIds: string[];
};

type StudyProgressStore = {
  version: 1;
  cases: Record<string, CaseMasteryStats>;
};

export type PracticeReplaySession = {
  caseId: string;
  focusIssueIds: string[];
  runDifficulty: RunDifficulty;
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
      runDifficulty: normalizeRunDifficulty(parsed.runDifficulty),
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

export function getStudyMomentumSummary(
  caseIds: string[],
  projectedRun?: ProjectedStudyRun,
): StudyMomentumSummary {
  const store = loadStudyProgressStore();
  const caseStats = caseIds.map((caseId) => ({
    caseId,
    stats: store.cases[caseId] ?? createDefaultCaseMasteryStats(),
  }));

  if (projectedRun) {
    const projectedIndex = caseStats.findIndex(({ caseId }) => caseId === projectedRun.caseId);
    if (projectedIndex >= 0) {
      const currentStats = caseStats[projectedIndex].stats;
      const normalizedScore = Number.isFinite(projectedRun.score)
        ? Math.max(0, Math.round(projectedRun.score))
        : 0;

      caseStats[projectedIndex] = {
        caseId: projectedRun.caseId,
        stats: {
          bestScore:
            currentStats.bestScore === null
              ? normalizedScore
              : Math.max(currentStats.bestScore, normalizedScore),
          timesPlayed: currentStats.timesPlayed + 1,
          lastPlayedAt: new Date().toISOString(),
          lastMissedIssueIds: normalizeIssueIds(projectedRun.missedIssueIds),
        },
      };
    }
  }

  const touchedCases = caseStats.filter(({ stats }) => stats.timesPlayed > 0);
  const totalRuns = caseStats.reduce((sum, { stats }) => sum + stats.timesPlayed, 0);
  const bestScores = touchedCases
    .map(({ stats }) => stats.bestScore)
    .filter((score): score is number => typeof score === "number");

  const strongestCase = caseStats.reduce<StudyMomentumSummary["strongestCase"]>((currentBest, entry) => {
    if (entry.stats.bestScore === null) {
      return currentBest;
    }

    if (!currentBest || entry.stats.bestScore > currentBest.bestScore) {
      return {
        caseId: entry.caseId,
        bestScore: entry.stats.bestScore,
      };
    }

    return currentBest;
  }, null);

  const mostReplayedCase = caseStats.reduce<StudyMomentumSummary["mostReplayedCase"]>((currentMost, entry) => {
    if (entry.stats.timesPlayed === 0) {
      return currentMost;
    }

    if (!currentMost || entry.stats.timesPlayed > currentMost.timesPlayed) {
      return {
        caseId: entry.caseId,
        timesPlayed: entry.stats.timesPlayed,
      };
    }

    return currentMost;
  }, null);

  return {
    totalCases: caseIds.length,
    casesTouched: touchedCases.length,
    totalRuns,
    averageBestScore:
      bestScores.length > 0
        ? Math.round(bestScores.reduce((sum, score) => sum + score, 0) / bestScores.length)
        : null,
    replayReadyCases: caseStats.filter(({ stats }) => stats.lastMissedIssueIds.length > 0).length,
    strongestCase,
    mostReplayedCase,
  };
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

export function queuePracticeReplay(
  caseId: string,
  focusIssueIds: string[],
  runDifficulty: RunDifficulty = "normal",
) {
  if (typeof window === "undefined") {
    return;
  }

  const session: PracticeReplaySession = {
    caseId,
    focusIssueIds: normalizeIssueIds(focusIssueIds),
    runDifficulty,
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
