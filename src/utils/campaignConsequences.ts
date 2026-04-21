import type { AuditCase } from "../types/audit";
import type { CaseCatalogEntry } from "./caseCatalog";
import { buildCaseCatalog } from "./caseCatalog";
import { getCampaignProgress } from "./campaignProgress";
import { getCareerProgressSummary, getCaseMasteryStats } from "./studyProgress";

export type CampaignConsequenceProfile = {
  pressureLevel: "stabilized" | "standard" | "pressured";
  evidenceAdjustment: number;
  revealAdjustment: number;
  inboxPressureBias: number;
  interviewPressureBias: number;
  label: string;
  summary: string;
};

function getArcForCase(caseCatalog: CaseCatalogEntry[], caseId: string) {
  const careerSummary = getCareerProgressSummary(caseCatalog);
  const progress = getCampaignProgress(caseCatalog, careerSummary);
  return progress.arcs.find((arc) => arc.caseIds.includes(caseId)) ?? null;
}

export function getCampaignConsequenceProfile(
  availableCases: AuditCase[],
  caseId: string,
): CampaignConsequenceProfile {
  const caseCatalog = buildCaseCatalog(availableCases);
  const arc = getArcForCase(caseCatalog, caseId);

  if (!arc) {
    return {
      pressureLevel: "standard",
      evidenceAdjustment: 0,
      revealAdjustment: 0,
      inboxPressureBias: 0,
      interviewPressureBias: 0,
      label: "Standard Pressure",
      summary: "The campaign is treating this engagement as a normal case file with no extra carryover pressure.",
    };
  }

  const caseStats = arc.caseIds.map((arcCaseId) => getCaseMasteryStats(arcCaseId));
  const replayPressure = caseStats.reduce((sum, stats) => sum + stats.lastMissedIssueIds.length, 0);
  const weakRuns = caseStats.filter((stats) => stats.timesPlayed > 0 && (stats.bestScore ?? 0) < 65).length;
  const strongRuns = caseStats.filter((stats) => (stats.bestScore ?? 0) >= 80).length;

  if (replayPressure >= 4 || weakRuns >= 2) {
    return {
      pressureLevel: "pressured",
      evidenceAdjustment: -1,
      revealAdjustment: -8,
      inboxPressureBias: 12,
      interviewPressureBias: -10,
      label: "Carryover Pressure",
      summary:
        "Earlier gaps in this campaign lane are still open, so this run starts leaner and makes corroboration harder to earn quickly.",
    };
  }

  if (strongRuns >= Math.max(1, Math.floor(arc.caseIds.length / 2))) {
    return {
      pressureLevel: "stabilized",
      evidenceAdjustment: 1,
      revealAdjustment: 8,
      inboxPressureBias: -4,
      interviewPressureBias: 10,
      label: "Stabilized Lane",
      summary:
        "Prior campaign work in this lane is holding up well, so the case opens with a cleaner evidence trail and slightly more cooperative discovery.",
    };
  }

  return {
    pressureLevel: "standard",
    evidenceAdjustment: 0,
    revealAdjustment: 0,
    inboxPressureBias: 0,
    interviewPressureBias: 0,
    label: "Standard Pressure",
    summary: "This engagement is inheriting a normal amount of campaign pressure from the current arc.",
  };
}
