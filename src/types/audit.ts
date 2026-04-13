export type EvidenceType = "document" | "system" | "screenshot" | "report";
export type Severity = "Low" | "Medium" | "High";

export type Stakeholder = {
  id: string;
  name: string;
  role: string;
  department: string;
};

export type Control = {
  id: string;
  name: string;
  description: string;
  framework: string;
};

export type EvidenceItem = {
  id: string;
  title: string;
  type: EvidenceType;
  content: string;
  relatedControls: string[];
  tags: string[];
};

export type Issue = {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  relatedEvidence: string[];
  recommendation: string;
};

export type DraftFinding = {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  linkedEvidenceIds: string[];
  recommendation: string;
};

export type InterviewPrompt = {
  id: string;
  stakeholderId: string;
  question: string;
  answer: string;
  revealsEvidenceIds?: string[];
};

export type InboxMessage = {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
};

export type AuditCase = {
  id: string;
  title: string;
  summary: string;
  objective: string;
  deadlineDays: number;
  initialEvidenceIds: string[];
  scope: string[];
  stakeholders: Stakeholder[];
  controls: Control[];
  evidence: EvidenceItem[];
  issues: Issue[];
  inbox: InboxMessage[];
  interviewPrompts: InterviewPrompt[];
  closeout: {
    managementMessage: string;
    auditorReflection: string;
  };
};
