import type { CaseCatalogEntry } from "./caseCatalog";
import { getCaseMasteryStats, type CareerProgressSummary } from "./studyProgress";

type ArcRequirement = {
  type: "played_cases" | "cleared_cases" | "career_level";
  value: number;
  label: string;
};

type CampaignArcDefinition = {
  id: string;
  title: string;
  summary: string;
  caseIds: string[];
  unlock?: {
    previousArcId: string;
    requirements: ArcRequirement[];
  };
};

export type CampaignArcProgress = {
  id: string;
  title: string;
  summary: string;
  unlocked: boolean;
  caseIds: string[];
  playedCount: number;
  clearedCount: number;
  masteredCount: number;
  averageBestScore: number | null;
  unmetRequirements: string[];
};

export type PromotionReviewItem = {
  label: string;
  complete: boolean;
  progressLabel: string;
};

export type PromotionReviewSummary = {
  title: string;
  summary: string;
  items: PromotionReviewItem[];
};

export type CampaignProgressSummary = {
  arcs: CampaignArcProgress[];
  unlockedCaseIds: string[];
  lockedCaseIds: string[];
  nextLockedArc: CampaignArcProgress | null;
  promotionReview: PromotionReviewSummary;
};

const CAMPAIGN_ARCS: CampaignArcDefinition[] = [
  {
    id: "desk-foundations",
    title: "Desk Foundations",
    summary: "Build the core audit loop across access, recovery, and change before the campaign opens wider.",
    caseIds: [
      "case-access-management",
      "case-backup-recovery",
      "case-change-management",
    ],
  },
  {
    id: "operations-pressure",
    title: "Operations Pressure",
    summary: "Handle faster-moving operational failures where judgment and evidence discipline start to tighten.",
    caseIds: [
      "case-patch-vulnerability",
      "case-incident-response",
      "case-vendor-access",
    ],
    unlock: {
      previousArcId: "desk-foundations",
      requirements: [
        { type: "played_cases", value: 2, label: "Play 2 Desk Foundations cases" },
        { type: "cleared_cases", value: 1, label: "Clear 1 Desk Foundations case at 65+" },
      ],
    },
  },
  {
    id: "governance-depth",
    title: "Governance Depth",
    summary: "Move into broader governance, lifecycle, and identity hygiene once the operations lane is stable.",
    caseIds: [
      "case-records-disposal",
      "case-device-disposal",
      "case-saas-license-governance",
      "case-service-account-governance",
    ],
    unlock: {
      previousArcId: "operations-pressure",
      requirements: [
        { type: "played_cases", value: 2, label: "Play 2 Operations Pressure cases" },
        { type: "cleared_cases", value: 1, label: "Clear 1 Operations Pressure case at 65+" },
      ],
    },
  },
  {
    id: "architecture-review",
    title: "Architecture Review",
    summary: "Finish with system-wide review work that expects broader coverage and cleaner report judgment.",
    caseIds: ["case-network-segmentation"],
    unlock: {
      previousArcId: "governance-depth",
      requirements: [
        { type: "played_cases", value: 2, label: "Play 2 Governance Depth cases" },
        { type: "cleared_cases", value: 1, label: "Clear 1 Governance Depth case at 65+" },
        { type: "career_level", value: 3, label: "Reach career level 3" },
      ],
    },
  },
];

function formatAverageBestScore(caseIds: string[]) {
  const scores = caseIds
    .map((caseId) => getCaseMasteryStats(caseId).bestScore)
    .filter((score): score is number => typeof score === "number");

  return scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
}

function getArcCaseStats(caseIds: string[]) {
  const stats = caseIds.map((caseId) => getCaseMasteryStats(caseId));
  return {
    playedCount: stats.filter((entry) => entry.timesPlayed > 0).length,
    clearedCount: stats.filter((entry) => (entry.bestScore ?? 0) >= 65).length,
    masteredCount: stats.filter((entry) => (entry.bestScore ?? 0) >= 80).length,
  };
}

function requirementSatisfied(
  requirement: ArcRequirement,
  source: { playedCount: number; clearedCount: number },
  careerSummary: CareerProgressSummary,
) {
  switch (requirement.type) {
    case "played_cases":
      return source.playedCount >= requirement.value;
    case "cleared_cases":
      return source.clearedCount >= requirement.value;
    case "career_level":
      return careerSummary.careerLevel >= requirement.value;
  }
}

export function getCampaignProgress(
  caseCatalog: CaseCatalogEntry[],
  careerSummary: CareerProgressSummary,
): CampaignProgressSummary {
  const rawArcProgress = CAMPAIGN_ARCS.map((arc) => {
    const arcStats = getArcCaseStats(arc.caseIds);
    const averageBestScore = formatAverageBestScore(arc.caseIds);

    return {
      id: arc.id,
      title: arc.title,
      summary: arc.summary,
      unlocked: false,
      caseIds: arc.caseIds,
      playedCount: arcStats.playedCount,
      clearedCount: arcStats.clearedCount,
      masteredCount: arcStats.masteredCount,
      averageBestScore,
      unmetRequirements: [] as string[],
    };
  });

  const resolvedArcProgress = rawArcProgress.map((arcProgress, index) => {
    const arcDefinition = CAMPAIGN_ARCS[index];
    if (!arcDefinition.unlock) {
      return {
        ...arcProgress,
        unlocked: true,
      };
    }

    const previousArc = rawArcProgress.find((entry) => entry.id === arcDefinition.unlock?.previousArcId);
    const unmetRequirements = arcDefinition.unlock.requirements
      .filter((requirement) =>
        !requirementSatisfied(
          requirement,
          previousArc ?? { playedCount: 0, clearedCount: 0 },
          careerSummary,
        ),
      )
      .map((requirement) => requirement.label);

    return {
      ...arcProgress,
      unlocked: unmetRequirements.length === 0,
      unmetRequirements,
    };
  });

  const caseIdsInCampaign = new Set(caseCatalog.map((auditCase) => auditCase.id));
  const unlockedCaseIds = resolvedArcProgress
    .filter((arc) => arc.unlocked)
    .flatMap((arc) => arc.caseIds)
    .filter((caseId) => caseIdsInCampaign.has(caseId));
  const lockedCaseIds = resolvedArcProgress
    .filter((arc) => !arc.unlocked)
    .flatMap((arc) => arc.caseIds)
    .filter((caseId) => caseIdsInCampaign.has(caseId));
  const nextLockedArc = resolvedArcProgress.find((arc) => !arc.unlocked) ?? null;

  const playedCasesTarget = Math.min(caseCatalog.length, Math.max(3, careerSummary.careerLevel + 2));
  const strongCasesTarget = Math.min(caseCatalog.length, Math.max(2, careerSummary.careerLevel));
  const coverageTarget = Math.min(
    careerSummary.categoryCoverage.length,
    Math.max(2, careerSummary.careerLevel + 1),
  );
  const coveredFamilies = careerSummary.categoryCoverage.filter((entry) => entry.touchedCases > 0).length;

  const promotionReview: PromotionReviewSummary = {
    title: careerSummary.nextPromotion
      ? `Promotion Review: ${careerSummary.nextPromotion.title}`
      : "Promotion Review: Principal Auditor",
    summary: careerSummary.nextPromotion
      ? `${careerSummary.nextPromotion.xpNeeded} more career points remain. Build a cleaner multi-case packet before the next review.`
      : "Top career tier reached. Keep broadening the archive and tightening the average closeout quality.",
    items: [
      {
        label: "Portfolio breadth",
        complete: careerSummary.casesTouched >= playedCasesTarget,
        progressLabel: `${careerSummary.casesTouched}/${playedCasesTarget} cases touched`,
      },
      {
        label: "Strong closeouts",
        complete: careerSummary.strongCases + careerSummary.masteredCases >= strongCasesTarget,
        progressLabel: `${careerSummary.strongCases + careerSummary.masteredCases}/${strongCasesTarget} strong or mastered cases`,
      },
      {
        label: "Family coverage",
        complete: coveredFamilies >= coverageTarget,
        progressLabel: `${coveredFamilies}/${coverageTarget} families covered`,
      },
    ],
  };

  return {
    arcs: resolvedArcProgress,
    unlockedCaseIds,
    lockedCaseIds,
    nextLockedArc,
    promotionReview,
  };
}
