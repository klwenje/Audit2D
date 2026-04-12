import type { DraftFinding, Issue } from "../types/audit";

export type ScoreBreakdown = {
  score: number;
  matchedIssueIds: string[];
  missedIssueIds: string[];
  unsupportedFindingIds: string[];
  severityMismatches: string[];
};

function normalizeTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function scoreFindings(expectedIssues: Issue[], submittedFindings: DraftFinding[]): ScoreBreakdown {
  let score = 0;
  const matchedIssueIds: string[] = [];
  const missedIssueIds: string[] = [];
  const unsupportedFindingIds: string[] = [];
  const severityMismatches: string[] = [];

  const expectedByTitle = new Map(expectedIssues.map((issue) => [normalizeTitle(issue.title), issue]));

  submittedFindings.forEach((finding) => {
    const match = expectedByTitle.get(normalizeTitle(finding.title));

    if (!match) {
      unsupportedFindingIds.push(finding.id);
      score -= 5;
      return;
    }

    matchedIssueIds.push(match.id);
    score += 15;

    if (finding.severity === match.severity) {
      score += 5;
    } else {
      severityMismatches.push(match.id);
    }

    const hasEvidenceOverlap = finding.linkedEvidenceIds.some((evidenceId) =>
      match.relatedEvidence.includes(evidenceId),
    );

    if (hasEvidenceOverlap) {
      score += 5;
    }

    if (finding.recommendation.trim().length > 0) {
      score += 2;
    }
  });

  expectedIssues.forEach((issue) => {
    if (!matchedIssueIds.includes(issue.id)) {
      missedIssueIds.push(issue.id);
    }
  });

  return {
    score: Math.max(0, Math.min(100, score)),
    matchedIssueIds,
    missedIssueIds,
    unsupportedFindingIds,
    severityMismatches,
  };
}
