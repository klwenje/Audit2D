import { create } from "zustand";
import { auditCases, getAuditCase } from "../data/cases";
import type { AuditCase, DraftFinding, Severity } from "../types/audit";
import { scoreFindings, type ScoreBreakdown } from "../utils/scoring";
import { normalizeRunDifficulty, type RunDifficulty } from "../utils/runDifficulty";
import { buildVariantCase, type RunMode, type RunVariantProfile } from "../utils/runVariant";
import type { PracticeBrief } from "../utils/remediationDrill";

type FindingDraftForm = {
  title: string;
  condition: string;
  criteria: string;
  cause: string;
  effect: string;
  severity: Severity;
  recommendation: string;
  linkedEvidenceIds: string[];
};

export type AuditStateSnapshot = {
  selectedCaseId: string;
  auditCaseId: string;
  runMode: "standard" | "practice";
  runDifficulty: RunDifficulty;
  runVariantKey: string;
  runVariantProfile: RunVariantProfile;
  practiceFocusIssueIds: string[];
  practiceBrief: PracticeBrief | null;
  selectedEvidenceId: string;
  reviewedEvidenceIds: string[];
  discoveredEvidenceIds: string[];
  interviewLogIds: string[];
  workstationTab: AuditState["workstationTab"];
  draftedFindings: DraftFinding[];
  findingDraftForm: FindingDraftForm;
  reportSubmitted: boolean;
  finalScore: ScoreBreakdown | null;
};

type AuditState = {
  availableCases: AuditCase[];
  selectedCaseId: string;
  auditCase: AuditCase;
  runMode: "standard" | "practice";
  runDifficulty: RunDifficulty;
  runVariantKey: string;
  runVariantProfile: RunVariantProfile;
  practiceFocusIssueIds: string[];
  practiceBrief: PracticeBrief | null;
  selectedEvidenceId: string;
  reviewedEvidenceIds: string[];
  discoveredEvidenceIds: string[];
  interviewLogIds: string[];
  workstationTab: "inbox" | "caseFile" | "interviews" | "evidence" | "findings";
  draftedFindings: DraftFinding[];
  findingDraftForm: FindingDraftForm;
  reportSubmitted: boolean;
  finalScore: ScoreBreakdown | null;
  setSelectedCase: (caseId: string) => void;
  beginSelectedCase: (runDifficulty: RunDifficulty) => void;
  beginPracticeCase: (
    caseId: string,
    focusIssueIds: string[],
    runDifficulty: RunDifficulty,
    practiceBrief?: PracticeBrief | null,
  ) => void;
  hydrateFromSave: (snapshot: AuditStateSnapshot) => void;
  getSnapshot: () => AuditStateSnapshot;
  setWorkstationTab: (tab: AuditState["workstationTab"]) => void;
  selectEvidence: (evidenceId: string) => void;
  markEvidenceReviewed: (evidenceId: string) => void;
  logInterviewPrompt: (promptId: string) => void;
  updateFindingDraftForm: (next: Partial<FindingDraftForm>) => void;
  toggleLinkedEvidence: (evidenceId: string) => void;
  addDraftFinding: () => void;
  removeDraftFinding: (findingId: string) => void;
  submitReport: () => void;
  resetAuditProgress: () => void;
};

const defaultFindingDraftForm: FindingDraftForm = {
  title: "",
  condition: "",
  criteria: "",
  cause: "",
  effect: "",
  severity: "Medium",
  recommendation: "",
  linkedEvidenceIds: [],
};

const starterCase = auditCases[0];
type DifficultyMode = RunDifficulty;

function createRunVariantKey(caseId: string, runMode: RunMode, focusIssueIds: string[]) {
  const focusKey = focusIssueIds.length > 0 ? [...focusIssueIds].sort().join("-") : "none";
  const randomKey =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  return `${caseId}:${runMode}:${focusKey}:${randomKey}`;
}

function createLegacyVariantKey(caseId: string, runMode: RunMode, focusIssueIds: string[]) {
  const focusKey = focusIssueIds.length > 0 ? [...focusIssueIds].sort().join("-") : "none";
  return `${caseId}:${runMode}:${focusKey}`;
}

function formatBriefList(values: string[], limit = 2) {
  return values.slice(0, limit).join(", ");
}

function buildFallbackPracticeBrief(auditCase: AuditCase, focusIssueIds: string[]): PracticeBrief {
  const focusIssues = auditCase.issues.filter((issue) => focusIssueIds.includes(issue.id));
  const focusIssueTitles = focusIssues.map((issue) => issue.title).filter(Boolean);
  const focusEvidenceTitles = Array.from(new Set(focusIssues.flatMap((issue) => issue.relatedEvidence)))
    .map((evidenceId) => auditCase.evidence.find((evidence) => evidence.id === evidenceId)?.title ?? evidenceId)
    .filter(Boolean);
  const interviewStakeholders = Array.from(
    new Set(
      focusIssues.flatMap((issue) =>
        auditCase.interviewPrompts
          .filter((prompt) =>
            prompt.revealsEvidenceIds?.some((evidenceId) => issue.relatedEvidence.includes(evidenceId)),
          )
          .map((prompt) => auditCase.stakeholders.find((stakeholder) => stakeholder.id === prompt.stakeholderId)?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ),
  );

  return {
    title: `Targeted Replay: ${auditCase.title}`,
    summary:
      focusIssueTitles.length > 0
        ? `This replay focuses on ${formatBriefList(focusIssueTitles)}. Start in the case file, then follow the evidence and interviews that support those control gaps.`
        : "This replay resets the case and rebuilds the evidence trail from the start.",
    actionItems: [
      {
        title: "Re-open the case file",
        detail:
          focusIssueTitles.length > 0
            ? `Re-read ${formatBriefList(focusIssueTitles)} and restate the control story before you draft again.`
            : "Re-read the case file and restate the control story before you draft again.",
        targetTab: "caseFile",
      },
      {
        title: "Audit the evidence trail",
        detail:
          focusEvidenceTitles.length > 0
            ? `Cross-check ${formatBriefList(focusEvidenceTitles)} so each missed issue stays tied to the right artifacts.`
            : "Cross-check the evidence locker so each missed issue stays tied to the right artifacts.",
        targetTab: "evidence",
      },
      {
        title: "Revisit the interviews",
        detail:
          interviewStakeholders.length > 0
            ? `Re-run the interview trail with ${formatBriefList(interviewStakeholders)} to reopen the evidence you missed.`
            : "Re-run the interview trail to reopen the evidence you missed.",
        targetTab: "interviews",
      },
      {
        title: "Redraft the memo",
        detail: "Finish in findings and tighten the condition, criteria, cause, effect, and recommendation frame.",
        targetTab: "findings",
      },
    ],
  };
}

function createCaseRunState(
  auditCase: AuditCase,
  runMode: RunMode,
  runDifficulty: DifficultyMode,
  runVariantKey: string,
  focusIssueIds: string[] = [],
  practiceBrief: PracticeBrief | null = null,
) {
  const validFocusIssueIds = focusIssueIds.filter((issueId) =>
    auditCase.issues.some((issue) => issue.id === issueId),
  );
  const variantResult = buildVariantCase(
    auditCase,
    runVariantKey,
    runMode,
    runDifficulty,
    validFocusIssueIds,
  );
  const runCase = variantResult.auditCase;
  const initialEvidenceIds = variantResult.initialEvidenceIds;
  const firstEvidenceId = initialEvidenceIds[0] ?? runCase.evidence[0]?.id ?? "";
  const normalizedPracticeBrief = normalizePracticeBrief(practiceBrief);
  const resolvedPracticeBrief =
    runMode === "practice"
      ? normalizedPracticeBrief && normalizedPracticeBrief.actionItems.length > 0
        ? normalizedPracticeBrief
        : buildFallbackPracticeBrief(runCase, validFocusIssueIds)
      : null;

  return {
    auditCase: runCase,
    runMode,
    runDifficulty,
    runVariantKey,
    runVariantProfile: variantResult.runVariantProfile,
    practiceFocusIssueIds: validFocusIssueIds,
    practiceBrief: resolvedPracticeBrief,
    selectedEvidenceId: firstEvidenceId,
    reviewedEvidenceIds: [],
    discoveredEvidenceIds: initialEvidenceIds,
    interviewLogIds: [],
    workstationTab: runMode === "practice" ? ("caseFile" as const) : ("inbox" as const),
    draftedFindings: [],
    findingDraftForm: defaultFindingDraftForm,
    reportSubmitted: false,
    finalScore: null,
  };
}

function sanitizeEvidenceSelection(
  auditCase: AuditCase,
  evidenceId: string,
  fallbackEvidenceIds: string[] = auditCase.initialEvidenceIds,
) {
  return auditCase.evidence.some((item) => item.id === evidenceId)
    ? evidenceId
    : fallbackEvidenceIds[0] ?? auditCase.evidence[0]?.id ?? "";
}

function sanitizeEvidenceIds(auditCase: AuditCase, evidenceIds: string[]) {
  return evidenceIds.filter((evidenceId) => auditCase.evidence.some((item) => item.id === evidenceId));
}

function sanitizeInterviewIds(auditCase: AuditCase, promptIds: string[]) {
  return promptIds.filter((promptId) => auditCase.interviewPrompts.some((prompt) => prompt.id === promptId));
}

function sanitizeDraftFindings(auditCase: AuditCase, findings: DraftFinding[]) {
  return findings.map((finding) => ({
    ...finding,
    title: typeof finding.title === "string" ? finding.title.trim() : "",
    description: typeof finding.description === "string" ? finding.description.trim() : "",
    condition:
      typeof finding.condition === "string" && finding.condition.trim().length > 0
        ? finding.condition.trim()
        : typeof finding.description === "string"
          ? finding.description.trim()
          : "",
    criteria: typeof finding.criteria === "string" ? finding.criteria.trim() : "",
    cause: typeof finding.cause === "string" ? finding.cause.trim() : "",
    effect: typeof finding.effect === "string" ? finding.effect.trim() : "",
    recommendation:
      typeof finding.recommendation === "string" ? finding.recommendation.trim() : "",
    linkedEvidenceIds: sanitizeEvidenceIds(auditCase, finding.linkedEvidenceIds ?? []),
  }));
}

function normalizeFindingDraftForm(
  snapshotForm: Partial<FindingDraftForm> & { description?: unknown },
): FindingDraftForm {
  const severity =
    snapshotForm.severity === "Low" || snapshotForm.severity === "High" ? snapshotForm.severity : "Medium";

  return {
    title: typeof snapshotForm.title === "string" ? snapshotForm.title : "",
    condition:
      typeof snapshotForm.condition === "string"
        ? snapshotForm.condition
        : typeof snapshotForm.description === "string"
          ? snapshotForm.description
          : "",
    criteria: typeof snapshotForm.criteria === "string" ? snapshotForm.criteria : "",
    cause: typeof snapshotForm.cause === "string" ? snapshotForm.cause : "",
    effect: typeof snapshotForm.effect === "string" ? snapshotForm.effect : "",
    severity,
    recommendation: typeof snapshotForm.recommendation === "string" ? snapshotForm.recommendation : "",
    linkedEvidenceIds: Array.isArray(snapshotForm.linkedEvidenceIds) ? snapshotForm.linkedEvidenceIds : [],
  };
}

function normalizeScoreBreakdown(score: ScoreBreakdown | null | undefined): ScoreBreakdown | null {
  if (!score) {
    return null;
  }

  return {
    score: Number.isFinite(score.score) ? score.score : 0,
    matchedIssueIds: Array.isArray(score.matchedIssueIds) ? score.matchedIssueIds : [],
    missedIssueIds: Array.isArray(score.missedIssueIds) ? score.missedIssueIds : [],
    unsupportedFindingIds: Array.isArray(score.unsupportedFindingIds) ? score.unsupportedFindingIds : [],
    severityMismatches: Array.isArray(score.severityMismatches) ? score.severityMismatches : [],
    wellSupportedFindingIds: Array.isArray(score.wellSupportedFindingIds) ? score.wellSupportedFindingIds : [],
    thinSupportedFindingIds: Array.isArray(score.thinSupportedFindingIds) ? score.thinSupportedFindingIds : [],
    memoStrongFindingIds: Array.isArray(score.memoStrongFindingIds) ? score.memoStrongFindingIds : [],
    memoDevelopingFindingIds: Array.isArray(score.memoDevelopingFindingIds)
      ? score.memoDevelopingFindingIds
      : [],
    memoSparseFindingIds: Array.isArray(score.memoSparseFindingIds) ? score.memoSparseFindingIds : [],
  };
}

function normalizePracticeBrief(brief: PracticeBrief | null | undefined): PracticeBrief | null {
  if (!brief || typeof brief.title !== "string" || typeof brief.summary !== "string") {
    return null;
  }

  const actionItems = Array.isArray(brief.actionItems)
    ? brief.actionItems.filter(
        (item) =>
          item &&
          typeof item.title === "string" &&
          typeof item.detail === "string" &&
          (item.targetTab === "caseFile" ||
            item.targetTab === "interviews" ||
            item.targetTab === "evidence" ||
            item.targetTab === "findings"),
      )
    : [];

  return {
    title: brief.title.trim(),
    summary: brief.summary.trim(),
    actionItems: actionItems.map((item) => ({
      ...item,
      title: item.title.trim(),
      detail: item.detail.trim(),
    })),
  };
}

export const useAuditStore = create<AuditState>((set, get) => ({
  availableCases: auditCases,
  selectedCaseId: starterCase.id,
  ...createCaseRunState(
    starterCase,
    "standard",
    "normal",
    createLegacyVariantKey(starterCase.id, "standard", []),
  ),
  setSelectedCase: (caseId) =>
    set((state) => {
      if (state.selectedCaseId === caseId) {
        return state;
      }

      return {
        selectedCaseId: getAuditCase(caseId).id,
      };
    }),
  beginSelectedCase: (runDifficulty) =>
    set((state) => {
      const nextCase = getAuditCase(state.selectedCaseId);
      return {
        selectedCaseId: nextCase.id,
        ...createCaseRunState(
          nextCase,
          "standard",
          normalizeRunDifficulty(runDifficulty),
          createRunVariantKey(nextCase.id, "standard", []),
          [],
          null,
        ),
      };
    }),
  beginPracticeCase: (caseId, focusIssueIds, runDifficulty, practiceBrief) =>
    set(() => {
      const nextCase = getAuditCase(caseId);
      return {
        selectedCaseId: nextCase.id,
        ...createCaseRunState(
          nextCase,
          "practice",
          normalizeRunDifficulty(runDifficulty),
          createRunVariantKey(nextCase.id, "practice", focusIssueIds),
          focusIssueIds,
          normalizePracticeBrief(practiceBrief),
        ),
      };
    }),
  hydrateFromSave: (snapshot) =>
    set(() => {
      const auditCase = getAuditCase(snapshot.auditCaseId);
      const snapshotRunMode = snapshot.runMode === "practice" ? "practice" : "standard";
      const snapshotPracticeFocusIssueIds = Array.isArray(snapshot.practiceFocusIssueIds)
        ? snapshot.practiceFocusIssueIds
        : [];
      const snapshotRunVariantKey =
        typeof snapshot.runVariantKey === "string" && snapshot.runVariantKey.trim().length > 0
          ? snapshot.runVariantKey
          : createLegacyVariantKey(auditCase.id, snapshotRunMode, snapshotPracticeFocusIssueIds);
      const snapshotRunDifficulty = normalizeRunDifficulty(snapshot.runDifficulty);
      const variantResult = buildVariantCase(
        auditCase,
        snapshotRunVariantKey,
        snapshotRunMode,
        snapshotRunDifficulty,
        snapshotPracticeFocusIssueIds.filter((issueId) =>
          auditCase.issues.some((issue) => issue.id === issueId),
        ),
      );
      const runCase = variantResult.auditCase;
      const discoveredEvidenceIds = Array.from(
        new Set([
          ...runCase.initialEvidenceIds,
          ...sanitizeEvidenceIds(runCase, snapshot.discoveredEvidenceIds),
        ]),
      );
      const practiceFocusIssueIds = snapshotPracticeFocusIssueIds.filter((issueId) =>
        runCase.issues.some((issue) => issue.id === issueId),
      );
      const normalizedPracticeBrief = normalizePracticeBrief(snapshot.practiceBrief);
      const practiceBrief =
        snapshotRunMode === "practice"
          ? normalizedPracticeBrief && normalizedPracticeBrief.actionItems.length > 0
            ? normalizedPracticeBrief
            : buildFallbackPracticeBrief(runCase, practiceFocusIssueIds)
          : null;
      const workstationTab =
        snapshot.workstationTab === "inbox" ||
        snapshot.workstationTab === "caseFile" ||
        snapshot.workstationTab === "interviews" ||
        snapshot.workstationTab === "evidence" ||
        snapshot.workstationTab === "findings"
          ? snapshot.workstationTab
          : snapshotRunMode === "practice"
            ? "caseFile"
            : "inbox";

      return {
        selectedCaseId: auditCases.some((entry) => entry.id === snapshot.selectedCaseId)
          ? snapshot.selectedCaseId
          : auditCase.id,
        auditCase: runCase,
        runMode: snapshotRunMode,
        runDifficulty: snapshotRunDifficulty,
        runVariantKey: snapshotRunVariantKey,
        runVariantProfile: variantResult.runVariantProfile,
        practiceFocusIssueIds,
        practiceBrief,
        selectedEvidenceId: sanitizeEvidenceSelection(
          runCase,
          snapshot.selectedEvidenceId,
          runCase.initialEvidenceIds,
        ),
        reviewedEvidenceIds: sanitizeEvidenceIds(runCase, snapshot.reviewedEvidenceIds),
        discoveredEvidenceIds,
        interviewLogIds: sanitizeInterviewIds(runCase, snapshot.interviewLogIds),
        workstationTab,
        draftedFindings: sanitizeDraftFindings(runCase, snapshot.draftedFindings),
        findingDraftForm: normalizeFindingDraftForm({
          ...defaultFindingDraftForm,
          ...snapshot.findingDraftForm,
          linkedEvidenceIds: sanitizeEvidenceIds(
            runCase,
            snapshot.findingDraftForm?.linkedEvidenceIds ?? [],
          ),
        }),
        reportSubmitted: Boolean(snapshot.reportSubmitted),
        finalScore: normalizeScoreBreakdown(snapshot.finalScore),
      };
    }),
  getSnapshot: (): AuditStateSnapshot => {
    const state = get();

    return {
      selectedCaseId: state.selectedCaseId,
      auditCaseId: state.auditCase.id,
      runMode: state.runMode,
      runDifficulty: state.runDifficulty,
      runVariantKey: state.runVariantKey,
      runVariantProfile: state.runVariantProfile,
      practiceFocusIssueIds: state.practiceFocusIssueIds,
      practiceBrief: state.practiceBrief,
      selectedEvidenceId: state.selectedEvidenceId,
      reviewedEvidenceIds: state.reviewedEvidenceIds,
      discoveredEvidenceIds: state.discoveredEvidenceIds,
      interviewLogIds: state.interviewLogIds,
      workstationTab: state.workstationTab,
      draftedFindings: state.draftedFindings,
      findingDraftForm: state.findingDraftForm,
      reportSubmitted: state.reportSubmitted,
      finalScore: state.finalScore,
    };
  },
  setWorkstationTab: (tab) => set({ workstationTab: tab }),
  selectEvidence: (evidenceId) => set({ selectedEvidenceId: evidenceId }),
  markEvidenceReviewed: (evidenceId) =>
    set((state) => ({
      reviewedEvidenceIds: state.reviewedEvidenceIds.includes(evidenceId)
        ? state.reviewedEvidenceIds
        : [...state.reviewedEvidenceIds, evidenceId],
    })),
  logInterviewPrompt: (promptId) =>
    set((state) => {
      const prompt = state.auditCase.interviewPrompts.find((entry) => entry.id === promptId);
      const revealedEvidenceIds = prompt?.revealsEvidenceIds ?? [];

      return {
        interviewLogIds: state.interviewLogIds.includes(promptId)
          ? state.interviewLogIds
          : [...state.interviewLogIds, promptId],
        discoveredEvidenceIds: [
          ...new Set([...state.discoveredEvidenceIds, ...revealedEvidenceIds]),
        ],
      };
    }),
  updateFindingDraftForm: (next) =>
    set((state) => ({
      findingDraftForm: {
        ...state.findingDraftForm,
        ...next,
      },
    })),
  toggleLinkedEvidence: (evidenceId) =>
    set((state) => {
      const alreadyLinked = state.findingDraftForm.linkedEvidenceIds.includes(evidenceId);
      return {
        findingDraftForm: {
          ...state.findingDraftForm,
          linkedEvidenceIds: alreadyLinked
            ? state.findingDraftForm.linkedEvidenceIds.filter((id) => id !== evidenceId)
            : [...state.findingDraftForm.linkedEvidenceIds, evidenceId],
        },
      };
    }),
  addDraftFinding: () =>
    set((state) => {
      const form = state.findingDraftForm;
      if (!form.title.trim() || !form.condition.trim()) {
        return state;
      }

      const nextFinding: DraftFinding = {
        id: `finding-${Date.now()}`,
        title: form.title.trim(),
        description: form.condition.trim(),
        condition: form.condition.trim(),
        criteria: form.criteria.trim(),
        cause: form.cause.trim(),
        effect: form.effect.trim(),
        severity: form.severity,
        recommendation: form.recommendation.trim(),
        linkedEvidenceIds: [...form.linkedEvidenceIds],
      };

      return {
        draftedFindings: [...state.draftedFindings, nextFinding],
        findingDraftForm: defaultFindingDraftForm,
      };
    }),
  removeDraftFinding: (findingId) =>
    set((state) => ({
      draftedFindings: state.draftedFindings.filter((finding) => finding.id !== findingId),
    })),
  submitReport: () =>
    set((state) => ({
      reportSubmitted: true,
      finalScore: scoreFindings(state.auditCase.issues, state.draftedFindings),
    })),
  resetAuditProgress: () =>
    set((state) => {
      const initialEvidenceIds = state.auditCase.initialEvidenceIds;
      const firstEvidenceId = initialEvidenceIds[0] ?? state.auditCase.evidence[0]?.id ?? "";

      return {
        selectedCaseId: state.selectedCaseId,
        auditCase: state.auditCase,
        runMode: state.runMode,
        runDifficulty: state.runDifficulty,
        runVariantKey: state.runVariantKey,
        runVariantProfile: state.runVariantProfile,
        practiceFocusIssueIds: state.practiceFocusIssueIds,
        practiceBrief: state.practiceBrief,
        selectedEvidenceId: firstEvidenceId,
        reviewedEvidenceIds: [],
        discoveredEvidenceIds: initialEvidenceIds,
        interviewLogIds: [],
        workstationTab: state.runMode === "practice" ? ("caseFile" as const) : ("inbox" as const),
        draftedFindings: [],
        findingDraftForm: defaultFindingDraftForm,
        reportSubmitted: false,
        finalScore: null,
      };
    }),
}));
