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

const WORD_SYNONYMS: Record<string, string> = {
  approved: "approve",
  approving: "approve",
  approval: "approve",
  approvals: "approve",
  authenticated: "authenticate",
  authentication: "authenticate",
  authorisation: "approve",
  authorization: "approve",
  authorizations: "approve",
  changed: "change",
  changing: "change",
  changes: "change",
  decommissioned: "remove",
  decommissioning: "remove",
  deprovision: "remove",
  deprovisioned: "remove",
  deprovisioning: "remove",
  disabled: "remove",
  disabling: "remove",
  disable: "remove",
  expire: "expiry",
  expired: "expiry",
  expiring: "expiry",
  expiration: "expiry",
  failures: "failure",
  failure: "failure",
  logged: "log",
  logging: "log",
  logs: "log",
  monitored: "monitor",
  monitoring: "monitor",
  monitor: "monitor",
  reviewing: "review",
  reviewed: "review",
  reviews: "review",
  testing: "test",
  tested: "test",
  tests: "test",
  terminated: "terminate",
  terminating: "terminate",
  termination: "terminate",
  validate: "validation",
  validated: "validation",
  validating: "validation",
  validation: "validation",
  vendor: "vendor",
  vendors: "vendor",
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "be",
  "been",
  "being",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "per",
  "so",
  "that",
  "the",
  "their",
  "then",
  "there",
  "these",
  "this",
  "those",
  "to",
  "via",
  "was",
  "were",
  "when",
  "where",
  "while",
  "with",
  "within",
]);

function normalizeToken(token: string) {
  const cleaned = token
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^'+|'+$/g, "");

  if (!cleaned) {
    return "";
  }

  const synonym = WORD_SYNONYMS[cleaned];
  if (synonym) {
    return synonym;
  }

  if (cleaned.length > 4 && cleaned.endsWith("ies")) {
    return `${cleaned.slice(0, -3)}y`;
  }

  if (cleaned.length > 5 && cleaned.endsWith("ing")) {
    return cleaned.slice(0, -3);
  }

  if (cleaned.length > 4 && cleaned.endsWith("ed")) {
    return cleaned.slice(0, -2);
  }

  if (cleaned.length > 4 && cleaned.endsWith("es")) {
    return cleaned.slice(0, -2);
  }

  if (cleaned.length > 4 && cleaned.endsWith("s") && !cleaned.endsWith("ss")) {
    return cleaned.slice(0, -1);
  }

  return cleaned;
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\s+/)
        .map(normalizeToken)
        .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
    ),
  );
}

function tokenCoverage(sourceTokens: string[], targetTokens: string[]) {
  if (sourceTokens.length === 0 || targetTokens.length === 0) {
    return 0;
  }

  const targetSet = new Set(targetTokens);
  let overlap = 0;

  sourceTokens.forEach((token) => {
    if (targetSet.has(token)) {
      overlap += 1;
    }
  });

  return overlap / sourceTokens.length;
}

function tokenDice(sourceTokens: string[], targetTokens: string[]) {
  if (sourceTokens.length === 0 || targetTokens.length === 0) {
    return 0;
  }

  const sourceSet = new Set(sourceTokens);
  const targetSet = new Set(targetTokens);
  let overlap = 0;

  sourceSet.forEach((token) => {
    if (targetSet.has(token)) {
      overlap += 1;
    }
  });

  return (2 * overlap) / (sourceSet.size + targetSet.size);
}

function scoreFindingAgainstIssue(finding: DraftFinding, issue: Issue) {
  const normalizedFindingTitle = normalizeTitle(finding.title);
  const normalizedIssueTitle = normalizeTitle(issue.title);

  if (!normalizedFindingTitle || !normalizedIssueTitle) {
    return 0;
  }

  if (normalizedFindingTitle === normalizedIssueTitle) {
    return 1;
  }

  const findingTitleTokens = tokenize(finding.title);
  const findingContextTokens = tokenize(
    `${finding.title} ${finding.description} ${finding.recommendation}`,
  );
  const issueTitleTokens = tokenize(issue.title);
  const issueContextTokens = tokenize(
    `${issue.title} ${issue.description} ${issue.recommendation}`,
  );

  const titleCoverage = tokenCoverage(findingTitleTokens, issueContextTokens);
  const titleSimilarity = tokenDice(findingTitleTokens, issueTitleTokens);
  const contextCoverage = tokenCoverage(findingContextTokens, issueContextTokens);

  if (findingTitleTokens.length < 2 && contextCoverage < 0.8) {
    return 0;
  }

  const blendedScore = 0.55 * titleCoverage + 0.25 * titleSimilarity + 0.2 * contextCoverage;

  return Math.max(0, Math.min(1, blendedScore));
}

export function scoreFindings(expectedIssues: Issue[], submittedFindings: DraftFinding[]): ScoreBreakdown {
  let score = 0;
  const matchedIssueIds: string[] = [];
  const missedIssueIds: string[] = [];
  const unsupportedFindingIds: string[] = [];
  const severityMismatches: string[] = [];

  const candidates = submittedFindings.flatMap((finding) =>
    expectedIssues.map((issue) => ({
      finding,
      issue,
      matchScore: scoreFindingAgainstIssue(finding, issue),
    })),
  );

  candidates.sort((left, right) => {
    if (right.matchScore !== left.matchScore) {
      return right.matchScore - left.matchScore;
    }

    const leftExact = normalizeTitle(left.finding.title) === normalizeTitle(left.issue.title);
    const rightExact = normalizeTitle(right.finding.title) === normalizeTitle(right.issue.title);

    if (rightExact !== leftExact) {
      return Number(rightExact) - Number(leftExact);
    }

    return left.issue.id.localeCompare(right.issue.id);
  });

  const matchedFindingIds = new Set<string>();
  const matchedIssueIdsSet = new Set<string>();
  const matchedPairs = new Map<string, Issue>();

  candidates.forEach((candidate) => {
    if (candidate.matchScore < 0.55) {
      return;
    }

    if (matchedFindingIds.has(candidate.finding.id) || matchedIssueIdsSet.has(candidate.issue.id)) {
      return;
    }

    matchedFindingIds.add(candidate.finding.id);
    matchedIssueIdsSet.add(candidate.issue.id);
    matchedPairs.set(candidate.finding.id, candidate.issue);
  });

  submittedFindings.forEach((finding) => {
    const match = matchedPairs.get(finding.id);

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
