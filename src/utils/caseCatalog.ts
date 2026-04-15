import type { AuditCase } from "../types/audit";

export type CaseFamilyFilter = "all" | "access" | "resilience" | "change" | "incident" | "data" | "vendor";
export type CaseSortMode = "recommended" | "easiest" | "hardest";

export type CaseCatalogEntry = AuditCase & {
  catalogIndex: number;
  familyId: Exclude<CaseFamilyFilter, "all">;
  familyLabel: string;
  difficultyScore: number;
  difficultyLabel: "Foundation" | "Intermediate" | "Advanced";
};

export const caseFamilyOptions: Array<{
  id: CaseFamilyFilter;
  label: string;
}> = [
  { id: "all", label: "All Cases" },
  { id: "access", label: "Access & Identity" },
  { id: "resilience", label: "Recovery & Continuity" },
  { id: "change", label: "Change & Patching" },
  { id: "incident", label: "Incident Response" },
  { id: "data", label: "Data Lifecycle" },
  { id: "vendor", label: "Vendor Access" },
];

export const caseSortOptions: Array<{
  id: CaseSortMode;
  label: string;
}> = [
  { id: "recommended", label: "Recommended" },
  { id: "easiest", label: "Easiest First" },
  { id: "hardest", label: "Hardest First" },
];

function buildCatalogSearchText(auditCase: AuditCase) {
  return [
    auditCase.id,
    auditCase.title,
    auditCase.summary,
    auditCase.objective,
    ...auditCase.scope,
    ...auditCase.controls.map((control) => `${control.name} ${control.description} ${control.framework}`),
    ...auditCase.issues.map((issue) => `${issue.title} ${issue.description}`),
  ]
    .join(" ")
    .toLowerCase();
}

function deriveFamily(auditCase: AuditCase) {
  const searchText = buildCatalogSearchText(auditCase);

  if (/(vendor|third[- ]?party|supplier)/.test(searchText)) {
    return { familyId: "vendor" as const, familyLabel: "Vendor Access" };
  }

  if (/(backup|recovery|restore|continuity|resilience)/.test(searchText)) {
    return { familyId: "resilience" as const, familyLabel: "Recovery & Continuity" };
  }

  if (/(incident|phishing|breach|response|alert)/.test(searchText)) {
    return { familyId: "incident" as const, familyLabel: "Incident Response" };
  }

  if (/(record|retention|disposal|sanitization|device|asset|media)/.test(searchText)) {
    return { familyId: "data" as const, familyLabel: "Data Lifecycle" };
  }

  if (/(change|patch|vulnerability|release|deployment|rollback)/.test(searchText)) {
    return { familyId: "change" as const, familyLabel: "Change & Patching" };
  }

  return { familyId: "access" as const, familyLabel: "Access & Identity" };
}

function deriveDifficultyScore(auditCase: AuditCase) {
  return (
    auditCase.issues.length * 4 +
    auditCase.controls.length * 2 +
    auditCase.evidence.length +
    auditCase.stakeholders.length * 2 +
    Math.max(0, 7 - auditCase.deadlineDays)
  );
}

function deriveDifficultyLabel(score: number) {
  if (score <= 24) {
    return "Foundation" as const;
  }

  if (score <= 30) {
    return "Intermediate" as const;
  }

  return "Advanced" as const;
}

export function buildCaseCatalog(auditCases: AuditCase[]): CaseCatalogEntry[] {
  return auditCases.map((auditCase, catalogIndex) => {
    const family = deriveFamily(auditCase);
    const difficultyScore = deriveDifficultyScore(auditCase);

    return {
      ...auditCase,
      catalogIndex,
      familyId: family.familyId,
      familyLabel: family.familyLabel,
      difficultyScore,
      difficultyLabel: deriveDifficultyLabel(difficultyScore),
    };
  });
}

export function filterCaseCatalog(cases: CaseCatalogEntry[], familyFilter: CaseFamilyFilter) {
  if (familyFilter === "all") {
    return cases;
  }

  return cases.filter((auditCase) => auditCase.familyId === familyFilter);
}

export function sortCaseCatalog(cases: CaseCatalogEntry[], sortMode: CaseSortMode) {
  const nextCases = [...cases];

  if (sortMode === "recommended") {
    return nextCases.sort((left, right) => left.catalogIndex - right.catalogIndex);
  }

  return nextCases.sort((left, right) => {
    if (left.difficultyScore === right.difficultyScore) {
      return left.catalogIndex - right.catalogIndex;
    }

    return sortMode === "easiest"
      ? left.difficultyScore - right.difficultyScore
      : right.difficultyScore - left.difficultyScore;
  });
}
