import { create } from "zustand";
import caseAccessManagement from "../data/case_access_management.json";
import type { AuditCase } from "../types/audit";

type AuditState = {
  auditCase: AuditCase;
  selectedEvidenceId: string;
  reviewedEvidenceIds: string[];
  workstationTab: "inbox" | "caseFile" | "evidence" | "findings";
  setWorkstationTab: (tab: AuditState["workstationTab"]) => void;
  selectEvidence: (evidenceId: string) => void;
  markEvidenceReviewed: (evidenceId: string) => void;
  resetAuditProgress: () => void;
};

const starterCase = caseAccessManagement as AuditCase;

export const useAuditStore = create<AuditState>((set) => ({
  auditCase: starterCase,
  selectedEvidenceId: starterCase.evidence[0]?.id ?? "",
  reviewedEvidenceIds: [],
  workstationTab: "inbox",
  setWorkstationTab: (tab) => set({ workstationTab: tab }),
  selectEvidence: (evidenceId) => set({ selectedEvidenceId: evidenceId }),
  markEvidenceReviewed: (evidenceId) =>
    set((state) => ({
      reviewedEvidenceIds: state.reviewedEvidenceIds.includes(evidenceId)
        ? state.reviewedEvidenceIds
        : [...state.reviewedEvidenceIds, evidenceId],
    })),
  resetAuditProgress: () =>
    set({
      selectedEvidenceId: starterCase.evidence[0]?.id ?? "",
      reviewedEvidenceIds: [],
      workstationTab: "inbox",
    }),
}));
