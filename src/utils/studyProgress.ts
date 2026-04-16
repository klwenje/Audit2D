import { normalizeRunDifficulty, type RunDifficulty } from "./runDifficulty";
import type { CaseCatalogEntry } from "./caseCatalog";

const STUDY_PROGRESS_KEY = "audit-desk-retro-study-progress-v1";
const PRACTICE_REPLAY_KEY = "audit-desk-retro-practice-replay-v1";

export type CaseMasteryStats = {
  bestScore: number | null;
  timesPlayed: number;
  lastPlayedAt: string | null;
  lastMissedIssueIds: string[];
  lastClearedIssueIds: string[];
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

export type CareerBandKey = "untested" | "building" | "stable" | "strong" | "trusted";

export type CareerBandEntry = {
  key: CareerBandKey;
  label: string;
  description: string;
  count: number;
};

export type CareerCoverageEntry = {
  familyId: string;
  familyLabel: string;
  touchedCases: number;
  totalCases: number;
  coveragePercent: number;
};

export type CareerProgressSummary = {
  careerLevel: number;
  careerTitle: string;
  careerXp: number;
  currentLevelMinXp: number;
  totalCases: number;
  casesTouched: number;
  totalRuns: number;
  masteredCases: number;
  strongCases: number;
  recentStrongCaseStreak: number;
  averageBestScore: number | null;
  masteryBand: {
    key: CareerBandKey;
    label: string;
    description: string;
  };
  masteryBands: CareerBandEntry[];
  categoryCoverage: CareerCoverageEntry[];
  uncoveredFamilies: string[];
  nextPromotion: {
    level: number;
    title: string;
    minXp: number;
    xpNeeded: number;
    progressPercent: number;
  } | null;
  nextMilestoneMessage: string;
};

export type StudyRunRecord = {
  caseId: string;
  playedAt: string;
  score: number;
  runDifficulty: RunDifficulty;
  missedIssueIds: string[];
  clearedIssueIds: string[];
  unsupportedCount: number;
  thinSupportedCount: number;
  coveredControlCount: number;
  totalControls: number;
};

export type PortfolioRunEntry = StudyRunRecord & {
  caseTitle: string;
  familyLabel: string;
};

export type ProjectedStudyRun = {
  caseId: string;
  score: number;
  missedIssueIds: string[];
};

type StudyProgressStore = {
  version: 1;
  cases: Record<string, CaseMasteryStats>;
  recentRuns?: StudyRunRecord[];
};

const CAREER_LEVELS = [
  { level: 1, title: "Trainee Auditor", minXp: 0 },
  { level: 2, title: "Field Auditor", minXp: 60 },
  { level: 3, title: "Senior Auditor", minXp: 120 },
  { level: 4, title: "Audit Lead", minXp: 180 },
  { level: 5, title: "Principal Auditor", minXp: 250 },
] as const;

const MASTERY_BANDS: Array<{
  key: CareerBandKey;
  label: string;
  description: string;
  test: (score: number | null) => boolean;
}> = [
  {
    key: "untested",
    label: "Untested",
    description: "Cases not yet played or recorded.",
    test: (score) => score === null,
  },
  {
    key: "building",
    label: "Building",
    description: "Early coverage with room to tighten evidence and severity.",
    test: (score) => typeof score === "number" && score < 45,
  },
  {
    key: "stable",
    label: "Stable",
    description: "Consistent fieldwork with some misses still worth revisiting.",
    test: (score) => typeof score === "number" && score >= 45 && score < 65,
  },
  {
    key: "strong",
    label: "Strong",
    description: "Reliable audit judgment with solid issue capture.",
    test: (score) => typeof score === "number" && score >= 65 && score < 80,
  },
  {
    key: "trusted",
    label: "Trusted",
    description: "High-confidence reporting and clean control coverage.",
    test: (score) => typeof score === "number" && score >= 80,
  },
];

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
    lastClearedIssueIds: [],
  };
}

function normalizeIssueIds(issueIds: string[]) {
  return Array.from(new Set(issueIds.filter(Boolean)));
}

function normalizeCaseMasteryStats(stats: Partial<CaseMasteryStats> | undefined): CaseMasteryStats {
  return {
    bestScore: typeof stats?.bestScore === "number" ? stats.bestScore : null,
    timesPlayed: typeof stats?.timesPlayed === "number" ? Math.max(0, stats.timesPlayed) : 0,
    lastPlayedAt: typeof stats?.lastPlayedAt === "string" ? stats.lastPlayedAt : null,
    lastMissedIssueIds: normalizeIssueIds(Array.isArray(stats?.lastMissedIssueIds) ? stats.lastMissedIssueIds : []),
    lastClearedIssueIds: normalizeIssueIds(
      Array.isArray(stats?.lastClearedIssueIds) ? stats.lastClearedIssueIds : [],
    ),
  };
}

function normalizeStudyRunRecord(run: Partial<StudyRunRecord> | undefined): StudyRunRecord | null {
  if (!run || typeof run.caseId !== "string" || typeof run.playedAt !== "string") {
    return null;
  }

  return {
    caseId: run.caseId,
    playedAt: run.playedAt,
    score: typeof run.score === "number" ? Math.max(0, Math.round(run.score)) : 0,
    runDifficulty: normalizeRunDifficulty(run.runDifficulty),
    missedIssueIds: normalizeIssueIds(Array.isArray(run.missedIssueIds) ? run.missedIssueIds : []),
    clearedIssueIds: normalizeIssueIds(Array.isArray(run.clearedIssueIds) ? run.clearedIssueIds : []),
    unsupportedCount: typeof run.unsupportedCount === "number" ? Math.max(0, run.unsupportedCount) : 0,
    thinSupportedCount: typeof run.thinSupportedCount === "number" ? Math.max(0, run.thinSupportedCount) : 0,
    coveredControlCount: typeof run.coveredControlCount === "number" ? Math.max(0, run.coveredControlCount) : 0,
    totalControls: typeof run.totalControls === "number" ? Math.max(0, run.totalControls) : 0,
  };
}

function getMasteryBand(score: number | null) {
  return MASTERY_BANDS.find((band) => band.test(score)) ?? MASTERY_BANDS[0];
}

function getCareerLevel(xp: number) {
  const sortedLevels = [...CAREER_LEVELS].sort((left, right) => right.minXp - left.minXp);
  return sortedLevels.find((level) => xp >= level.minXp) ?? CAREER_LEVELS[0];
}

function getNextCareerLevel(level: number) {
  return CAREER_LEVELS.find((entry) => entry.level === level + 1) ?? null;
}

function getRecentStrongCaseStreak(caseStats: Array<{ stats: CaseMasteryStats }>) {
  const recentCases = [...caseStats]
    .filter(({ stats }) => stats.timesPlayed > 0 && typeof stats.lastPlayedAt === "string")
    .sort((left, right) => {
      const leftTime = left.stats.lastPlayedAt ? new Date(left.stats.lastPlayedAt).getTime() : 0;
      const rightTime = right.stats.lastPlayedAt ? new Date(right.stats.lastPlayedAt).getTime() : 0;
      return rightTime - leftTime;
    });

  let streak = 0;
  for (const entry of recentCases) {
    if (typeof entry.stats.bestScore === "number" && entry.stats.bestScore >= 65) {
      streak += 1;
      continue;
    }

    break;
  }

  return streak;
}

function deriveCareerXp(caseStats: Array<{ stats: CaseMasteryStats; familyId: string }>) {
  const touchedCases = caseStats.filter(({ stats }) => stats.timesPlayed > 0);
  const totalRuns = caseStats.reduce((sum, { stats }) => sum + stats.timesPlayed, 0);
  const averageBestScore = touchedCases.length
    ? Math.round(
        touchedCases.reduce((sum, { stats }) => sum + (stats.bestScore ?? 0), 0) / touchedCases.length,
      )
    : null;
  const masteredCases = touchedCases.filter(({ stats }) => (stats.bestScore ?? 0) >= 80).length;
  const strongCases = touchedCases.filter(
    ({ stats }) => (stats.bestScore ?? 0) >= 65 && (stats.bestScore ?? 0) < 80,
  ).length;
  const stableCases = touchedCases.filter(
    ({ stats }) => (stats.bestScore ?? 0) >= 45 && (stats.bestScore ?? 0) < 65,
  ).length;
  const coveredFamilies = new Set(
    caseStats.filter(({ stats }) => stats.timesPlayed > 0).map(({ familyId }) => familyId),
  );
  const careerXp =
    totalRuns * 3 +
    touchedCases.length * 8 +
    masteredCases * 10 +
    strongCases * 6 +
    stableCases * 3 +
    coveredFamilies.size * 8 +
    (averageBestScore === null ? 0 : Math.round(averageBestScore / 3));

  return {
    careerXp,
    totalRuns,
    touchedCases: touchedCases.length,
    averageBestScore,
    masteredCases,
    strongCases,
  };
}

function buildCareerMilestoneMessage(summary: Omit<CareerProgressSummary, "nextMilestoneMessage">) {
  if (summary.nextPromotion) {
    return `Need ${summary.nextPromotion.xpNeeded} more career points for ${summary.nextPromotion.title}.`;
  }

  if (summary.uncoveredFamilies.length > 0) {
    return `Complete a ${summary.uncoveredFamilies[0]} case to round out your portfolio and keep promotion reviews moving.`;
  }

  if (summary.recentStrongCaseStreak > 0) {
    return `Your recent strong-case streak is ${summary.recentStrongCaseStreak}. Keep stacking clean closeouts to build the next review packet.`;
  }

  return "Keep strengthening evidence support and control coverage so the next review reads as a promotion-ready portfolio.";
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

    return {
      version: 1,
      cases: parsed.cases,
      recentRuns: Array.isArray(parsed.recentRuns)
        ? parsed.recentRuns
            .map((run) => normalizeStudyRunRecord(run))
            .filter((run): run is StudyRunRecord => Boolean(run))
        : [],
    };
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
  return normalizeCaseMasteryStats(store.cases[caseId]);
}

export function getStudyMomentumSummary(
  caseIds: string[],
  projectedRun?: ProjectedStudyRun,
): StudyMomentumSummary {
  const store = loadStudyProgressStore();
  const caseStats = caseIds.map((caseId) => ({
    caseId,
    stats: normalizeCaseMasteryStats(store.cases[caseId]),
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
          lastClearedIssueIds: currentStats.lastClearedIssueIds,
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

export function getCareerProgressSummary(
  caseCatalog: CaseCatalogEntry[],
  projectedRun?: ProjectedStudyRun,
): CareerProgressSummary {
  const store = loadStudyProgressStore();
  const caseStats = caseCatalog.map((entry) => ({
    caseId: entry.id,
    familyId: entry.familyId,
    familyLabel: entry.familyLabel,
    stats: normalizeCaseMasteryStats(store.cases[entry.id]),
  }));

  if (projectedRun) {
    const projectedIndex = caseStats.findIndex(({ caseId }) => caseId === projectedRun.caseId);
    if (projectedIndex >= 0) {
      const currentStats = caseStats[projectedIndex].stats;
      const normalizedScore = Number.isFinite(projectedRun.score)
        ? Math.max(0, Math.round(projectedRun.score))
        : 0;

      caseStats[projectedIndex] = {
        ...caseStats[projectedIndex],
        stats: {
          bestScore:
            currentStats.bestScore === null
              ? normalizedScore
              : Math.max(currentStats.bestScore, normalizedScore),
          timesPlayed: currentStats.timesPlayed + 1,
          lastPlayedAt: new Date().toISOString(),
          lastMissedIssueIds: normalizeIssueIds(projectedRun.missedIssueIds),
          lastClearedIssueIds: currentStats.lastClearedIssueIds,
        },
      };
    }
  }

  const touchedCases = caseStats.filter(({ stats }) => stats.timesPlayed > 0);
  const touchedCaseIds = new Set(touchedCases.map(({ caseId }) => caseId));
  const familyCoverage = caseCatalog.reduce<Map<string, CareerCoverageEntry>>((coverage, entry) => {
    const current = coverage.get(entry.familyId) ?? {
      familyId: entry.familyId,
      familyLabel: entry.familyLabel,
      touchedCases: 0,
      totalCases: 0,
      coveragePercent: 0,
    };

    current.totalCases += 1;
    if (touchedCaseIds.has(entry.id)) {
      current.touchedCases += 1;
    }
    current.coveragePercent =
      current.totalCases > 0 ? Math.round((current.touchedCases / current.totalCases) * 100) : 0;
    coverage.set(entry.familyId, current);
    return coverage;
  }, new Map());

  const categoryCoverage = Array.from(familyCoverage.values()).sort((left, right) =>
    left.familyLabel.localeCompare(right.familyLabel),
  );
  const uncoveredFamilies = categoryCoverage
    .filter((entry) => entry.touchedCases === 0)
    .map((entry) => entry.familyLabel);
  const masteryBands = MASTERY_BANDS.map((band) => ({
    key: band.key,
    label: band.label,
    description: band.description,
    count: caseStats.filter(({ stats }) => band.test(stats.bestScore)).length,
  }));
  const careerMath = deriveCareerXp(caseStats);
  const masteryBand = getMasteryBand(careerMath.averageBestScore);
  const currentLevel = getCareerLevel(careerMath.careerXp);
  const nextLevel = getNextCareerLevel(currentLevel.level);
  const recentStrongCaseStreak = getRecentStrongCaseStreak(caseStats);
  const nextPromotion = nextLevel
    ? {
        level: nextLevel.level,
        title: nextLevel.title,
        minXp: nextLevel.minXp,
        xpNeeded: Math.max(0, nextLevel.minXp - careerMath.careerXp),
        progressPercent:
          nextLevel.minXp > currentLevel.minXp
            ? Math.min(
                100,
                Math.max(
                  0,
                  Math.round(
                    ((careerMath.careerXp - currentLevel.minXp) /
                      (nextLevel.minXp - currentLevel.minXp)) *
                      100,
                  ),
                ),
              )
            : 100,
      }
    : null;
  const summaryWithoutMessage = {
    careerLevel: currentLevel.level,
    careerTitle: currentLevel.title,
    careerXp: careerMath.careerXp,
    currentLevelMinXp: currentLevel.minXp,
    totalCases: caseCatalog.length,
    casesTouched: careerMath.touchedCases,
    totalRuns: careerMath.totalRuns,
    masteredCases: careerMath.masteredCases,
    strongCases: careerMath.strongCases,
    recentStrongCaseStreak,
    averageBestScore: careerMath.averageBestScore,
    masteryBand: {
      key: masteryBand.key,
      label: masteryBand.label,
      description: masteryBand.description,
    },
    masteryBands,
    categoryCoverage,
    uncoveredFamilies,
    nextPromotion,
    nextMilestoneMessage: "",
  };

  return {
    ...summaryWithoutMessage,
    nextMilestoneMessage: buildCareerMilestoneMessage(summaryWithoutMessage),
  };
}

export function getRecentStudyRuns(
  caseCatalog: CaseCatalogEntry[],
  limit = 8,
): PortfolioRunEntry[] {
  const store = loadStudyProgressStore();

  return (store.recentRuns ?? [])
    .slice()
    .sort((left, right) => new Date(right.playedAt).getTime() - new Date(left.playedAt).getTime())
    .slice(0, limit)
    .map((run) => {
      const caseEntry = caseCatalog.find((entry) => entry.id === run.caseId);

      return {
        ...run,
        caseTitle: caseEntry?.title ?? run.caseId,
        familyLabel: caseEntry?.familyLabel ?? "Unknown Family",
      };
    });
}

export function recordCaseStudyRun(
  caseId: string,
  score: number,
  missedIssueIds: string[],
  metadata?: {
    runDifficulty?: RunDifficulty;
    unsupportedCount?: number;
    thinSupportedCount?: number;
    coveredControlCount?: number;
    totalControls?: number;
  },
) {
  if (typeof window === "undefined") {
    return;
  }

  const store = loadStudyProgressStore();
  const currentStats = normalizeCaseMasteryStats(store.cases[caseId]);
  const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0;
  const normalizedMissedIssueIds = normalizeIssueIds(missedIssueIds);
  const clearedIssueIds = currentStats.lastMissedIssueIds.filter(
    (issueId) => !normalizedMissedIssueIds.includes(issueId),
  );
  const playedAt = new Date().toISOString();

  store.cases[caseId] = {
    bestScore:
      currentStats.bestScore === null
        ? normalizedScore
        : Math.max(currentStats.bestScore, normalizedScore),
    timesPlayed: currentStats.timesPlayed + 1,
    lastPlayedAt: playedAt,
    lastMissedIssueIds: normalizedMissedIssueIds,
    lastClearedIssueIds: clearedIssueIds,
  };

  const nextRecentRuns: StudyRunRecord[] = [
    {
      caseId,
      playedAt,
      score: normalizedScore,
      runDifficulty: normalizeRunDifficulty(metadata?.runDifficulty),
      missedIssueIds: normalizedMissedIssueIds,
      clearedIssueIds,
      unsupportedCount: Math.max(0, metadata?.unsupportedCount ?? 0),
      thinSupportedCount: Math.max(0, metadata?.thinSupportedCount ?? 0),
      coveredControlCount: Math.max(0, metadata?.coveredControlCount ?? 0),
      totalControls: Math.max(0, metadata?.totalControls ?? 0),
    },
    ...(store.recentRuns ?? []),
  ];

  store.recentRuns = nextRecentRuns.slice(0, 18);

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
