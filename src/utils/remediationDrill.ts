import type { DraftFinding, Issue, AuditCase } from "../types/audit";
import type { ScoreBreakdown } from "./scoring";
import type { RunVariantProfile } from "./runVariant";

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
  runVariantProfile?: RunVariantProfile | null,
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
  const sparseMemoFindings = draftedFindings.filter((finding) =>
    finalScore.memoSparseFindingIds.includes(finding.id),
  );
  const developingMemoFindings = draftedFindings.filter((finding) =>
    finalScore.memoDevelopingFindingIds.includes(finding.id),
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

  if (sparseMemoFindings.length > 0 || developingMemoFindings.length > 0) {
    const memoTargets = [...sparseMemoFindings, ...developingMemoFindings].map((finding) => finding.title);
    actions.push({
      title: "Reframe the memo structure",
      detail:
        memoTargets.length > 0
          ? `Rewrite ${formatList(memoTargets)} using the full memo frame: condition, criteria, cause, effect, and recommendation.`
          : "Rewrite the memo using the full frame: condition, criteria, cause, effect, and recommendation.",
      targetTab: "findings",
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

  if (runVariantProfile) {
    const priority = new Map(runVariantProfile.drillPriority.map((tab, index) => [tab, index]));
    actions.sort((left, right) => {
      const leftPriority = priority.get(left.targetTab) ?? runVariantProfile.drillPriority.length;
      const rightPriority = priority.get(right.targetTab) ?? runVariantProfile.drillPriority.length;

      if (leftPriority === rightPriority) {
        return left.title.localeCompare(right.title);
      }

      return leftPriority - rightPriority;
    });
  }

  const summary =
    missedIssues.length > 0
      ? `This drill is built around ${missedIssues.length} missed issue${missedIssues.length === 1 ? "" : "s"} and the evidence trail behind them.`
      : sparseMemoFindings.length > 0 || developingMemoFindings.length > 0
        ? "This drill is built around strengthening the memo frame so your findings read like audit work, not notes."
      : unsupportedFindings.length > 0 || thinSupportedFindings.length > 0
        ? "This drill is built around tightening evidence support so your report reads like defensible audit work."
        : "This drill is built around recalibrating severity and coverage so the next report lands more cleanly.";

  return {
    title: runVariantProfile ? `${runVariantProfile.label} Drill` : "Adaptive Remediation Drill",
    summary: runVariantProfile ? `${runVariantProfile.summary} ${summary}` : summary,
    actionItems: actions.slice(0, 4),
  };
}
