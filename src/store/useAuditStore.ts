import { create } from "zustand";
import { auditCases, getAuditCase } from "../data/cases";
import type { AuditCase, DraftFinding, Severity } from "../types/audit";
import { scoreFindings, type ScoreBreakdown } from "../utils/scoring";

type FindingDraftForm = {
  title: string;
  description: string;
  severity: Severity;
  recommendation: string;
  linkedEvidenceIds: string[];
};

type AuditState = {
  availableCases: AuditCase[];
  selectedCaseId: string;
  auditCase: AuditCase;
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
  beginSelectedCase: () => void;
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

function createCaseProgressState(auditCase: AuditCase) {
  const initialEvidenceIds = auditCase.initialEvidenceIds;
  const firstEvidenceId = initialEvidenceIds[0] ?? auditCase.evidence[0]?.id ?? "";

  return {
    auditCase,
    selectedEvidenceId: firstEvidenceId,
    reviewedEvidenceIds: [],
    discoveredEvidenceIds: initialEvidenceIds,
    interviewLogIds: [],
    workstationTab: "inbox" as const,
    draftedFindings: [],
    findingDraftForm: defaultFindingDraftForm,
    reportSubmitted: false,
    finalScore: null,
  };
}

const starterCase = auditCases[0];

export const useAuditStore = create<AuditState>((set) => ({
  availableCases: auditCases,
  selectedCaseId: starterCase.id,
  ...createCaseProgressState(starterCase),
  setSelectedCase: (caseId) =>
    set((state) => {
      if (state.selectedCaseId === caseId) {
        return state;
      }

      return {
        selectedCaseId: getAuditCase(caseId).id,
      };
    }),
  beginSelectedCase: () =>
    set((state) => {
      const nextCase = getAuditCase(state.selectedCaseId);
      return createCaseProgressState(nextCase);
    }),
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
    set((state) => createCaseProgressState(state.auditCase)),
}));
