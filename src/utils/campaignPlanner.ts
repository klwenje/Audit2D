import type { CaseCatalogEntry } from "./caseCatalog";
import type { RunDifficulty } from "./runDifficulty";
import { getCaseDossierSummary, getCaseMasteryStats, type CareerProgressSummary } from "./studyProgress";

export type CampaignRecommendation =
  | {
      mode: "practice";
      caseId: string;
      title: string;
      summary: string;
      rationale: string;
      actionLabel: string;
      runDifficulty: RunDifficulty;
      focusIssueIds: string[];
    }
  | {
      mode: "standard";
      caseId: string;
      title: string;
      summary: string;
      rationale: string;
      actionLabel: string;
      runDifficulty: RunDifficulty;
      focusIssueIds: [];
    };

function getIssueLabel(auditCase: CaseCatalogEntry, issueId: string) {
  return auditCase.issues.find((issue) => issue.id === issueId)?.title ?? issueId;
}

function getWeakestUntouchedFamily(
  caseCatalog: CaseCatalogEntry[],
  careerSummary: CareerProgressSummary,
) {
  const nextFamily = careerSummary.categoryCoverage
    .slice()
    .sort((left, right) => left.coveragePercent - right.coveragePercent || left.familyLabel.localeCompare(right.familyLabel))[0];

  if (!nextFamily) {
    return null;
  }

  return caseCatalog.find((auditCase) => auditCase.familyId === nextFamily.familyId && getCaseMasteryStats(auditCase.id).timesPlayed === 0)
    ?? caseCatalog.find((auditCase) => auditCase.familyId === nextFamily.familyId);
}

function getStretchCase(caseCatalog: CaseCatalogEntry[]) {
  const playedCases = caseCatalog
    .map((auditCase) => ({
      auditCase,
      stats: getCaseMasteryStats(auditCase.id),
    }))
    .filter((entry) => entry.stats.timesPlayed > 0)
    .sort((left, right) => (right.stats.bestScore ?? 0) - (left.stats.bestScore ?? 0));

  const anchorCase = playedCases[0];
  if (!anchorCase) {
    return caseCatalog[0] ?? null;
  }

  return (
    caseCatalog.find(
      (auditCase) =>
        auditCase.familyId !== anchorCase.auditCase.familyId &&
        auditCase.difficultyScore >= anchorCase.auditCase.difficultyScore,
    ) ??
    caseCatalog.find((auditCase) => getCaseMasteryStats(auditCase.id).timesPlayed === 0) ??
    anchorCase.auditCase
  );
}

export function getCampaignRecommendation(
  caseCatalog: CaseCatalogEntry[],
  careerSummary: CareerProgressSummary,
): CampaignRecommendation | null {
  if (caseCatalog.length === 0) {
    return null;
  }

  const replayCandidate = caseCatalog
    .map((auditCase) => {
      const stats = getCaseMasteryStats(auditCase.id);
      const dossier = getCaseDossierSummary(auditCase.id, (issueId) => getIssueLabel(auditCase, issueId));
      const pressureScore =
        stats.lastMissedIssueIds.length * 5 +
        dossier.averageUnsupportedCount * 4 +
        dossier.averageThinSupportedCount * 2 +
        (stats.bestScore === null ? 0 : Math.max(0, 70 - stats.bestScore));

      return {
        auditCase,
        stats,
        dossier,
        pressureScore,
      };
    })
    .filter((entry) => entry.stats.lastMissedIssueIds.length > 0)
    .sort((left, right) => right.pressureScore - left.pressureScore || left.auditCase.catalogIndex - right.auditCase.catalogIndex)[0];

  if (replayCandidate && replayCandidate.pressureScore >= 8) {
    const focusLabels = replayCandidate.stats.lastMissedIssueIds
      .map((issueId) => getIssueLabel(replayCandidate.auditCase, issueId))
      .slice(0, 2);

    return {
      mode: "practice",
      caseId: replayCandidate.auditCase.id,
      title: `Close the gap in ${replayCandidate.auditCase.title}`,
      summary:
        replayCandidate.stats.lastMissedIssueIds.length === 1
          ? `One active miss is still open: ${focusLabels[0] ?? "the remaining control gap"}.`
          : `This case still carries ${replayCandidate.stats.lastMissedIssueIds.length} active misses and is the highest-pressure replay in the archive.`,
      rationale:
        replayCandidate.dossier.averageUnsupportedCount > 0
          ? "Recent runs are still leaking unsupported claims, so the best next move is to tighten judgment before expanding scope."
          : `Recurring pressure is forming around ${focusLabels.join(", ") || "the remaining issues"}, so a focused replay should pay off fastest.`,
      actionLabel:
        replayCandidate.stats.lastMissedIssueIds.length === 1 ? "Finish Final Gap" : "Launch Focused Replay",
      runDifficulty: "normal",
      focusIssueIds: replayCandidate.stats.lastMissedIssueIds,
    };
  }

  const familyExpansionCase = getWeakestUntouchedFamily(caseCatalog, careerSummary);
  if (familyExpansionCase && getCaseMasteryStats(familyExpansionCase.id).timesPlayed === 0) {
    return {
      mode: "standard",
      caseId: familyExpansionCase.id,
      title: `Expand into ${familyExpansionCase.familyLabel}`,
      summary: `Your portfolio coverage is thinnest here, so this is the best family to open next.`,
      rationale: `Starting ${familyExpansionCase.title} will strengthen progression breadth before you overfit to your current strongest lanes.`,
      actionLabel: "Start Recommended Case",
      runDifficulty: "normal",
      focusIssueIds: [],
    };
  }

  const stretchCase = getStretchCase(caseCatalog);
  if (!stretchCase) {
    return null;
  }

  const stretchStats = getCaseMasteryStats(stretchCase.id);
  const recommendedDifficulty: RunDifficulty =
    careerSummary.averageBestScore !== null && careerSummary.averageBestScore >= 75 ? "hard" : "normal";

  return {
    mode: "standard",
    caseId: stretchCase.id,
    title: stretchStats.timesPlayed === 0 ? `Open ${stretchCase.title}` : `Push a stronger run on ${stretchCase.title}`,
    summary:
      stretchStats.timesPlayed === 0
        ? `You’ve stabilized enough of the archive to open a fresh case with higher progression value.`
        : `This case fits the next difficulty step without abandoning portfolio breadth.`,
    rationale:
      recommendedDifficulty === "hard"
        ? "Your current portfolio is strong enough to support a harder run with leaner starting evidence."
        : "This keeps momentum moving without jumping too far past the current mastery band.",
    actionLabel: stretchStats.timesPlayed === 0 ? "Start Stretch Case" : "Run Growth Pass",
    runDifficulty: recommendedDifficulty,
    focusIssueIds: [],
  };
}
