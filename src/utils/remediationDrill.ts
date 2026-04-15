import type { DraftFinding, Issue, AuditCase } from "../types/audit";
import type { ScoreBreakdown } from "./scoring";

export type PracticeBriefAction = {
  title: string;
  detail: string;
  targetTab: "caseFile" | "interviews" | "evidence" | "findings";
};

export type PracticeBrief = {
  title: string;
  summary: string;
  actionItems: PracticeBriefAction[];
};

function formatList(values: string[], limit = 2) {
  return values.slice(0, limit).join(", ");
}

export function buildAdaptivePracticeBrief(
  auditCase: AuditCase,
  finalScore: ScoreBreakdown,
  draftedFindings: DraftFinding[],
): PracticeBrief {
  const missedIssues = auditCase.issues.filter((issue) => finalScore.missedIssueIds.includes(issue.id));
  const unsupportedFindings = draftedFindings.filter((finding) =>
    finalScore.unsupportedFindingIds.includes(finding.id),
  );
  const thinSupportedFindings = draftedFindings.filter((finding) =>
    finalScore.thinSupportedFindingIds.includes(finding.id),
  );
  const severityMismatchIssues = auditCase.issues.filter((issue) =>
    finalScore.severityMismatches.includes(issue.id),
  );

  const actions: PracticeBriefAction[] = [];

  if (missedIssues.length > 0) {
    const firstMissedIssue = missedIssues[0];
    const missedControlNames = Array.from(
      new Set(
        firstMissedIssue.relatedEvidence.flatMap((evidenceId) =>
          auditCase.evidence.find((evidence) => evidence.id === evidenceId)?.relatedControls ?? [],
        ),
      ),
    )
      .map((controlId) => auditCase.controls.find((control) => control.id === controlId)?.name ?? controlId)
      .filter(Boolean);

    actions.push({
      title: "Re-open the control story",
      detail:
        missedControlNames.length > 0
          ? `Start in the case file and trace ${firstMissedIssue.title} back to ${formatList(missedControlNames)}.`
          : `Start in the case file and trace the missed control story behind ${firstMissedIssue.title}.`,
      targetTab: "caseFile",
    });
  }

  const interviewStakeholders = Array.from(
    new Set(
      missedIssues.flatMap((issue) =>
        auditCase.interviewPrompts
          .filter((prompt) =>
            prompt.revealsEvidenceIds?.some((evidenceId) => issue.relatedEvidence.includes(evidenceId)),
          )
          .map((prompt) => auditCase.stakeholders.find((stakeholder) => stakeholder.id === prompt.stakeholderId)?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ),
  );

  if (interviewStakeholders.length > 0) {
    actions.push({
      title: "Re-run the interviews",
      detail: `Use the interview log to question ${formatList(interviewStakeholders)} and unlock the evidence trail you missed.`,
      targetTab: "interviews",
    });
  }

  const evidenceTitles = Array.from(
    new Set(
      [
        ...missedIssues.flatMap((issue) => issue.relatedEvidence),
        ...thinSupportedFindings.flatMap((finding) => finding.linkedEvidenceIds),
      ].map((evidenceId) => auditCase.evidence.find((evidence) => evidence.id === evidenceId)?.title ?? evidenceId),
    ),
  );

  if (evidenceTitles.length > 0 || unsupportedFindings.length > 0) {
    actions.push({
      title: "Audit the evidence locker",
      detail:
        evidenceTitles.length > 0
          ? `Cross-check ${formatList(evidenceTitles)} before drafting again so the report stays tied to the right artifacts.`
          : "Revisit the evidence locker and link each claim to the exact record that supports it.",
      targetTab: "evidence",
    });
  }

  const findingsNeedingAttention = [
    ...unsupportedFindings.map((finding) => finding.title),
    ...thinSupportedFindings.map((finding) => finding.title),
    ...severityMismatchIssues.map((issue) => issue.title),
  ];

  actions.push({
    title: "Redraft the memo",
    detail:
      findingsNeedingAttention.length > 0
        ? `Finish in findings and tighten ${formatList(findingsNeedingAttention)} before you submit again.`
        : "Finish in findings and restate the issue with clearer severity and evidence support.",
    targetTab: "findings",
  });

  const summary =
    missedIssues.length > 0
      ? `This drill is built around ${missedIssues.length} missed issue${missedIssues.length === 1 ? "" : "s"} and the evidence trail behind them.`
      : unsupportedFindings.length > 0 || thinSupportedFindings.length > 0
        ? "This drill is built around tightening evidence support so your report reads like defensible audit work."
        : "This drill is built around recalibrating severity and coverage so the next report lands more cleanly.";

  return {
    title: "Adaptive Remediation Drill",
    summary,
    actionItems: actions.slice(0, 4),
  };
}
