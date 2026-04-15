import { create } from "zustand";
import { auditCases, getAuditCase } from "../data/cases";
import type { AuditCase, DraftFinding, Severity } from "../types/audit";
import { scoreFindings, type ScoreBreakdown } from "../utils/scoring";
import { normalizeRunDifficulty, type RunDifficulty } from "../utils/runDifficulty";

type FindingDraftForm = {
  title: string;
  description: string;
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
  practiceFocusIssueIds: string[];
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
  practiceFocusIssueIds: string[];
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
  beginPracticeCase: (caseId: string, focusIssueIds: string[], runDifficulty: RunDifficulty) => void;
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
  description: "",
  severity: "Medium",
  recommendation: "",
  linkedEvidenceIds: [],
};

const starterCase = auditCases[0];

type RunMode = AuditState["runMode"];
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

function createSeededRandom(seed: string) {
  let state = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleBySeed<T>(items: T[], seed: string) {
  const next = [...items];
  const random = createSeededRandom(seed);

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function buildVariantCase(
  auditCase: AuditCase,
  runVariantKey: string,
  runMode: RunMode,
  runDifficulty: DifficultyMode,
  focusIssueIds: string[],
) {
  const shuffledInbox = shuffleBySeed(auditCase.inbox, `${runVariantKey}:inbox`);
  const shuffledEvidence = shuffleBySeed(auditCase.evidence, `${runVariantKey}:evidence`);
  const shuffledInterviewPrompts = shuffleBySeed(
    auditCase.interviewPrompts,
    `${runVariantKey}:interviews`,
  );

  const validEvidenceIdSet = new Set(auditCase.evidence.map((item) => item.id));
  const baseInitialEvidenceIds = auditCase.initialEvidenceIds.filter((evidenceId) =>
    validEvidenceIdSet.has(evidenceId),
  );
  const relevantEvidenceIds = shuffledEvidence
    .map((item) => item.id)
    .filter((evidenceId) =>
      auditCase.issues.some((issue) => issue.relatedEvidence.includes(evidenceId)),
    );

  let initialEvidenceIds: string[];
  if (runDifficulty === "easy") {
    initialEvidenceIds = Array.from(new Set([...relevantEvidenceIds, ...baseInitialEvidenceIds]));
  } else if (runDifficulty === "hard") {
    initialEvidenceIds = baseInitialEvidenceIds.slice(0, 1);
  } else {
    initialEvidenceIds = [...baseInitialEvidenceIds];
  }

  if (runMode === "practice") {
    const focusEvidenceIds = focusIssueIds.flatMap((issueId) => {
      const issue = auditCase.issues.find((item) => item.id === issueId);
      return issue?.relatedEvidence ?? [];
    });

    initialEvidenceIds = Array.from(new Set([...focusEvidenceIds, ...initialEvidenceIds]));
  }

  if (initialEvidenceIds.length === 0 && shuffledEvidence.length > 0) {
    initialEvidenceIds = [shuffledEvidence[0].id];
  }

  const orderedInitialEvidenceIds = shuffledEvidence
    .map((item) => item.id)
    .filter((evidenceId) => initialEvidenceIds.includes(evidenceId));
  const fallbackInitialEvidenceIds = initialEvidenceIds.filter((evidenceId) =>
    validEvidenceIdSet.has(evidenceId),
  );
  const orderedInterviewPrompts =
    runDifficulty === "easy"
      ? [
          ...shuffledInterviewPrompts.filter((prompt) => (prompt.revealsEvidenceIds?.length ?? 0) > 0),
          ...shuffledInterviewPrompts.filter((prompt) => (prompt.revealsEvidenceIds?.length ?? 0) === 0),
        ]
      : runDifficulty === "hard"
        ? [
            ...shuffledInterviewPrompts.filter((prompt) => (prompt.revealsEvidenceIds?.length ?? 0) === 0),
            ...shuffledInterviewPrompts.filter((prompt) => (prompt.revealsEvidenceIds?.length ?? 0) > 0),
          ]
        : shuffledInterviewPrompts;

  return {
    ...auditCase,
    inbox: shuffledInbox,
    evidence: shuffledEvidence,
    interviewPrompts: orderedInterviewPrompts,
    initialEvidenceIds: orderedInitialEvidenceIds.length > 0 ? orderedInitialEvidenceIds : fallbackInitialEvidenceIds,
  };
}

function createCaseRunState(
  auditCase: AuditCase,
  runMode: RunMode,
  runDifficulty: DifficultyMode,
  runVariantKey: string,
  focusIssueIds: string[] = [],
) {
  const validFocusIssueIds = focusIssueIds.filter((issueId) =>
    auditCase.issues.some((issue) => issue.id === issueId),
  );
  const runCase = buildVariantCase(
    auditCase,
    runVariantKey,
    runMode,
    runDifficulty,
    validFocusIssueIds,
  );
  const initialEvidenceIds = runCase.initialEvidenceIds;
  const firstEvidenceId = initialEvidenceIds[0] ?? runCase.evidence[0]?.id ?? "";

  return {
    auditCase: runCase,
    runMode,
    runDifficulty,
    runVariantKey,
    practiceFocusIssueIds: validFocusIssueIds,
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
    linkedEvidenceIds: sanitizeEvidenceIds(auditCase, finding.linkedEvidenceIds),
  }));
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
        ),
      };
    }),
  beginPracticeCase: (caseId, focusIssueIds, runDifficulty) =>
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
      const runCase = buildVariantCase(
        auditCase,
        snapshotRunVariantKey,
        snapshotRunMode,
        snapshotRunDifficulty,
        snapshotPracticeFocusIssueIds.filter((issueId) =>
          auditCase.issues.some((issue) => issue.id === issueId),
        ),
      );
      const discoveredEvidenceIds = Array.from(
        new Set([
          ...runCase.initialEvidenceIds,
          ...sanitizeEvidenceIds(runCase, snapshot.discoveredEvidenceIds),
        ]),
      );

      return {
        selectedCaseId: getAuditCase(snapshot.selectedCaseId).id,
        auditCase: runCase,
        runMode: snapshotRunMode,
        runDifficulty: snapshotRunDifficulty,
        runVariantKey: snapshotRunVariantKey,
        practiceFocusIssueIds: snapshotPracticeFocusIssueIds.filter((issueId) =>
          runCase.issues.some((issue) => issue.id === issueId),
        ),
        selectedEvidenceId: sanitizeEvidenceSelection(
          runCase,
          snapshot.selectedEvidenceId,
          runCase.initialEvidenceIds,
        ),
        reviewedEvidenceIds: sanitizeEvidenceIds(runCase, snapshot.reviewedEvidenceIds),
        discoveredEvidenceIds,
        interviewLogIds: sanitizeInterviewIds(runCase, snapshot.interviewLogIds),
        workstationTab: snapshot.workstationTab,
        draftedFindings: sanitizeDraftFindings(runCase, snapshot.draftedFindings),
        findingDraftForm: {
          ...snapshot.findingDraftForm,
          linkedEvidenceIds: sanitizeEvidenceIds(runCase, snapshot.findingDraftForm.linkedEvidenceIds),
        },
        reportSubmitted: snapshot.reportSubmitted,
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
      practiceFocusIssueIds: state.practiceFocusIssueIds,
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
      if (!form.title.trim() || !form.description.trim()) {
        return state;
      }

      const nextFinding: DraftFinding = {
        id: `finding-${Date.now()}`,
        title: form.title.trim(),
        description: form.description.trim(),
        severity: form.severity,
        recommendation: form.recommendation.trim(),
        linkedEvidenceIds: form.linkedEvidenceIds,
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
        practiceFocusIssueIds: state.practiceFocusIssueIds,
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
