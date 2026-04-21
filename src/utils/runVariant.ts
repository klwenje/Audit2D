import type { AuditCase, EvidenceItem, InboxMessage, InterviewPrompt } from "../types/audit";
import type { RunDifficulty } from "./runDifficulty";
import type { CampaignConsequenceProfile } from "./campaignConsequences";

export type RunMode = "standard" | "practice";

export type RunVariantTab = "caseFile" | "interviews" | "evidence" | "findings";

export type RunVariantId = "casefile-led" | "evidence-led" | "interview-led" | "control-trail";

export type RunVariantProfile = {
  id: RunVariantId;
  label: string;
  summary: string;
  initialEvidenceLimit: number;
  drillPriority: RunVariantTab[];
  campaignPressureLabel?: string;
  campaignPressureSummary?: string;
};

export type RunVariantBuildResult = {
  auditCase: AuditCase;
  runVariantProfile: RunVariantProfile;
  initialEvidenceIds: string[];
};

type VariantDefinition = RunVariantProfile & {
  evidenceTerms: string[];
  inboxTerms: string[];
  interviewRevealPreference: "reveals-first" | "hidden-first";
};

const VARIANT_DEFINITIONS: VariantDefinition[] = [
  {
    id: "casefile-led",
    label: "Case File Led",
    summary: "Frontloads scope, control, and policy records so the case reads from the top down.",
    initialEvidenceLimit: 3,
    drillPriority: ["caseFile", "evidence", "interviews", "findings"],
    evidenceTerms: ["scope", "policy", "procedure", "control", "matrix", "plan", "diagram", "risk"],
    inboxTerms: ["scope", "approval", "deadline", "policy", "control", "planning"],
    interviewRevealPreference: "hidden-first",
  },
  {
    id: "evidence-led",
    label: "Evidence Led",
    summary: "Starts with direct artifacts and system records so corroboration comes forward first.",
    initialEvidenceLimit: 3,
    drillPriority: ["evidence", "interviews", "caseFile", "findings"],
    evidenceTerms: ["log", "screenshot", "ticket", "record", "export", "alert", "trace", "timestamp"],
    inboxTerms: ["evidence", "log", "record", "report", "screenshot", "ticket", "alert"],
    interviewRevealPreference: "reveals-first",
  },
  {
    id: "interview-led",
    label: "Interview Led",
    summary: "Starts with stakeholder threads before pulling the artifacts back into view.",
    initialEvidenceLimit: 2,
    drillPriority: ["interviews", "caseFile", "evidence", "findings"],
    evidenceTerms: ["email", "chat", "note", "interview", "conversation", "approval", "reply"],
    inboxTerms: ["question", "reply", "follow up", "call", "walkthrough", "confirm", "interview"],
    interviewRevealPreference: "reveals-first",
  },
  {
    id: "control-trail",
    label: "Control Trail",
    summary: "Groups the run around control coverage so the evidence trail reads like an audit program.",
    initialEvidenceLimit: 2,
    drillPriority: ["findings", "caseFile", "evidence", "interviews"],
    evidenceTerms: ["control", "monitor", "review", "exception", "compliance", "risk", "reconcile"],
    inboxTerms: ["control", "risk", "finding", "exception", "compliance", "review"],
    interviewRevealPreference: "reveals-first",
  },
];

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function createSeededHash(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function toSeededNoise(seed: string, value: string) {
  return (createSeededHash(`${seed}:${value}`) % 1000) / 1000;
}

function getIssueEvidenceIds(auditCase: AuditCase) {
  return new Set(auditCase.issues.flatMap((issue) => issue.relatedEvidence));
}

function getPromptRevealEvidenceIds(auditCase: AuditCase) {
  return new Set(
    auditCase.interviewPrompts.flatMap((prompt) => prompt.revealsEvidenceIds ?? []),
  );
}

function getFocusEvidenceIds(auditCase: AuditCase, focusIssueIds: string[]) {
  const focusIssueSet = new Set(focusIssueIds);

  return new Set(
    auditCase.issues
      .filter((issue) => focusIssueSet.has(issue.id))
      .flatMap((issue) => issue.relatedEvidence),
  );
}

function scoreEvidenceItem(
  evidence: EvidenceItem,
  auditCase: AuditCase,
  profile: VariantDefinition,
  seed: string,
  runMode: RunMode,
  runDifficulty: RunDifficulty,
  issueEvidenceIds: Set<string>,
  focusEvidenceIds: Set<string>,
  promptRevealEvidenceIds: Set<string>,
  campaignConsequence: CampaignConsequenceProfile | null,
) {
  const text = normalizeText([evidence.title, evidence.content, ...evidence.tags].join(" "));
  let score = 0;

  if (auditCase.initialEvidenceIds.includes(evidence.id)) {
    score += 120;
  }

  if (issueEvidenceIds.has(evidence.id)) {
    score += 70;
  }

  if (focusEvidenceIds.has(evidence.id)) {
    score += 120;
  }

  if (promptRevealEvidenceIds.has(evidence.id)) {
    score += 24;
  }

  if (runDifficulty === "easy") {
    score += 6;
  } else if (runDifficulty === "hard") {
    score -= 6;
  }

  if (runMode === "practice") {
    score += focusEvidenceIds.has(evidence.id) ? 18 : 0;
  }

  if (campaignConsequence) {
    if (promptRevealEvidenceIds.has(evidence.id)) {
      score += campaignConsequence.revealAdjustment;
    }

    if (campaignConsequence.pressureLevel === "pressured" && evidence.type === "system") {
      score -= 6;
    }

    if (campaignConsequence.pressureLevel === "stabilized" && evidence.type === "document") {
      score += 6;
    }
  }

  switch (profile.id) {
    case "casefile-led":
      if (containsAny(text, profile.evidenceTerms)) {
        score += 28;
      }
      if (evidence.type === "document" || evidence.type === "report") {
        score += 14;
      }
      break;
    case "evidence-led":
      if (containsAny(text, profile.evidenceTerms)) {
        score += 28;
      }
      if (evidence.type === "system" || evidence.type === "screenshot") {
        score += 16;
      }
      break;
    case "interview-led":
      if (containsAny(text, profile.evidenceTerms)) {
        score += 28;
      }
      if (evidence.type === "document" || evidence.type === "report") {
        score += 6;
      }
      break;
    case "control-trail":
      if (containsAny(text, profile.evidenceTerms)) {
        score += 22;
      }
      score += evidence.relatedControls.length * 8;
      if (evidence.relatedControls.length > 1) {
        score += 10;
      }
      break;
  }

  return score + toSeededNoise(seed, evidence.id);
}

function scoreInboxMessage(message: InboxMessage, profile: VariantDefinition, seed: string) {
  const text = normalizeText([message.from, message.subject, message.preview, message.body].join(" "));
  let score = 0;

  if (containsAny(text, profile.inboxTerms)) {
    score += 24;
  }

  if (profile.id === "casefile-led" && containsAny(text, ["approval", "deadline", "scope", "control"])) {
    score += 16;
  }

  if (profile.id === "evidence-led" && containsAny(text, ["evidence", "log", "record", "screenshot", "ticket"])) {
    score += 16;
  }

  if (profile.id === "interview-led" && containsAny(text, ["reply", "question", "call", "walkthrough", "confirm"])) {
    score += 16;
  }

  if (profile.id === "control-trail" && containsAny(text, ["control", "risk", "finding", "exception"])) {
    score += 16;
  }

  return score + toSeededNoise(seed, message.id);
}

function scoreInboxMessageWithPressure(
  message: InboxMessage,
  profile: VariantDefinition,
  seed: string,
  campaignConsequence: CampaignConsequenceProfile | null,
) {
  let score = scoreInboxMessage(message, profile, seed);

  if (campaignConsequence) {
    score += campaignConsequence.inboxPressureBias;
  }

  return score;
}

function scoreInterviewPrompt(
  prompt: InterviewPrompt,
  auditCase: AuditCase,
  profile: VariantDefinition,
  seed: string,
  runDifficulty: RunDifficulty,
  campaignConsequence: CampaignConsequenceProfile | null,
) {
  const revealCount = prompt.revealsEvidenceIds?.length ?? 0;
  const revealedControlCount = (prompt.revealsEvidenceIds ?? []).reduce((count, evidenceId) => {
    const evidence = auditCase.evidence.find((entry) => entry.id === evidenceId);
    return count + (evidence?.relatedControls.length ?? 0);
  }, 0);

  let score = 0;

  if (revealCount > 0) {
    score += profile.interviewRevealPreference === "reveals-first" ? 26 : 8;
  } else {
    score += profile.interviewRevealPreference === "hidden-first" ? 18 : 6;
  }

  if (profile.id === "control-trail") {
    score += revealedControlCount * 6;
  }

  if (runDifficulty === "easy") {
    score += revealCount > 0 ? 8 : 0;
  } else if (runDifficulty === "hard") {
    score += revealCount === 0 ? 6 : 0;
  }

  if (campaignConsequence) {
    if (revealCount > 0) {
      score += campaignConsequence.interviewPressureBias;
    } else {
      score -= campaignConsequence.interviewPressureBias / 2;
    }
  }

  return score + toSeededNoise(seed, prompt.id);
}

function getInitialEvidenceLimit(
  profile: VariantDefinition,
  runDifficulty: RunDifficulty,
  campaignConsequence: CampaignConsequenceProfile | null,
) {
  const difficultyAdjustment = runDifficulty === "easy" ? 1 : runDifficulty === "hard" ? -1 : 0;
  const campaignAdjustment = campaignConsequence?.evidenceAdjustment ?? 0;
  const nextLimit = profile.initialEvidenceLimit + difficultyAdjustment + campaignAdjustment;
  return Math.max(1, Math.min(5, nextLimit));
}

export function buildRunVariantProfile(seed: string, auditCase: AuditCase) {
  const selector = createSeededHash(`${seed}:${auditCase.id}`);
  return VARIANT_DEFINITIONS[selector % VARIANT_DEFINITIONS.length];
}

export function buildVariantCase(
  auditCase: AuditCase,
  seed: string,
  runMode: RunMode,
  runDifficulty: RunDifficulty,
  focusIssueIds: string[],
  campaignConsequence: CampaignConsequenceProfile | null = null,
): RunVariantBuildResult {
  const baseRunVariantProfile = buildRunVariantProfile(seed, auditCase);
  const runVariantProfile: RunVariantProfile = {
    ...baseRunVariantProfile,
    campaignPressureLabel: campaignConsequence?.label,
    campaignPressureSummary: campaignConsequence?.summary,
  };
  const issueEvidenceIds = getIssueEvidenceIds(auditCase);
  const focusEvidenceIds = getFocusEvidenceIds(auditCase, focusIssueIds);
  const promptRevealEvidenceIds = getPromptRevealEvidenceIds(auditCase);

  const orderedEvidence = [...auditCase.evidence].sort((left, right) => {
    const leftScore = scoreEvidenceItem(
      left,
      auditCase,
      baseRunVariantProfile,
      seed,
      runMode,
      runDifficulty,
      issueEvidenceIds,
      focusEvidenceIds,
      promptRevealEvidenceIds,
      campaignConsequence,
    );
    const rightScore = scoreEvidenceItem(
      right,
      auditCase,
      baseRunVariantProfile,
      seed,
      runMode,
      runDifficulty,
      issueEvidenceIds,
      focusEvidenceIds,
      promptRevealEvidenceIds,
      campaignConsequence,
    );

    if (leftScore === rightScore) {
      return left.id.localeCompare(right.id);
    }

    return rightScore - leftScore;
  });

  const orderedInbox = [...auditCase.inbox].sort((left, right) => {
    const leftScore = scoreInboxMessageWithPressure(left, baseRunVariantProfile, seed, campaignConsequence);
    const rightScore = scoreInboxMessageWithPressure(right, baseRunVariantProfile, seed, campaignConsequence);

    if (leftScore === rightScore) {
      return left.id.localeCompare(right.id);
    }

    return rightScore - leftScore;
  });

  const orderedInterviewPrompts = [...auditCase.interviewPrompts].sort((left, right) => {
    const leftScore = scoreInterviewPrompt(
      left,
      auditCase,
      baseRunVariantProfile,
      seed,
      runDifficulty,
      campaignConsequence,
    );
    const rightScore = scoreInterviewPrompt(
      right,
      auditCase,
      baseRunVariantProfile,
      seed,
      runDifficulty,
      campaignConsequence,
    );

    if (leftScore === rightScore) {
      return left.id.localeCompare(right.id);
    }

    return rightScore - leftScore;
  });

  const initialEvidenceIds = orderedEvidence
    .slice(0, getInitialEvidenceLimit(baseRunVariantProfile, runDifficulty, campaignConsequence))
    .map((evidence) => evidence.id);

  const nextAuditCase: AuditCase = {
    ...auditCase,
    inbox: orderedInbox,
    evidence: orderedEvidence,
    interviewPrompts: orderedInterviewPrompts,
    initialEvidenceIds:
      initialEvidenceIds.length > 0 ? initialEvidenceIds : auditCase.initialEvidenceIds.slice(0, 1),
  };

  return {
    auditCase: nextAuditCase,
    runVariantProfile,
    initialEvidenceIds: nextAuditCase.initialEvidenceIds,
  };
}
