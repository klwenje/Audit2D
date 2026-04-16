import { useEffect, useMemo, useState } from "react";
import { useAuditStore } from "../store/useAuditStore";
import { useGameStore } from "../store/useGameStore";
import { SceneHelpOverlay } from "../components/SceneHelpOverlay";
import { ScenePauseOverlay } from "../components/ScenePauseOverlay";
import { playBackTone, playConfirmTone } from "../utils/audio";
import type { DraftFinding } from "../types/audit";
import { getFindingMemoProfile } from "../utils/scoring";

const MEMO_FIELD_LABELS = [
  { key: "condition", label: "Condition" },
  { key: "criteria", label: "Criteria" },
  { key: "cause", label: "Cause" },
  { key: "effect", label: "Effect" },
  { key: "recommendation", label: "Recommendation" },
] as const;

type MemoFieldKey = (typeof MEMO_FIELD_LABELS)[number]["key"];

function getDraftFindingMemoField(finding: DraftFinding, field: MemoFieldKey) {
  if (field === "condition") {
    return (finding.condition ?? finding.description ?? "").trim();
  }

  return (finding[field] ?? "").trim();
}

function getMemoCompletenessLabel(filledCount: number) {
  if (filledCount >= 5) return "Fully Framed";
  if (filledCount >= 3) return "Developing";
  return "Sparse";
}

function getEvidenceArtifactLabel(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("email")) return "Email Record";
  if (normalized.includes("log")) return "System Log";
  if (normalized.includes("ticket")) return "Ticket";
  if (normalized.includes("screenshot") || normalized.includes("screen")) return "Screenshot";
  if (normalized.includes("policy")) return "Policy Excerpt";
  if (normalized.includes("note")) return "Interview Note";
  return "Case Record";
}

type PracticeReplayTargetTab = "caseFile" | "interviews" | "evidence" | "findings";

type PracticeReplayFocus = {
  title: string;
  detail: string;
  targetTab: PracticeReplayTargetTab;
  evidenceId?: string;
};

const DEFAULT_PRACTICE_REPLAY_FOCUS: PracticeReplayFocus = {
  title: "Review the case file",
  detail: "Start by checking the scope memo and working outward through the evidence trail.",
  targetTab: "caseFile",
};

function getPracticeReplayTabLabel(tab: PracticeReplayTargetTab) {
  switch (tab) {
    case "caseFile":
      return "Case File";
    case "interviews":
      return "Interviews";
    case "evidence":
      return "Evidence";
    case "findings":
      return "Findings";
  }
}

function buildPracticeReplayFocus(
  auditCase: {
    evidence: Array<{ id: string; title: string }>;
    interviewPrompts: Array<{ stakeholderId: string; revealsEvidenceIds?: string[] }>;
    stakeholders: Array<{ id: string; name: string }>;
  },
  issue: { title: string; relatedEvidence: string[] },
): PracticeReplayFocus {
  const relatedEvidenceItems = issue.relatedEvidence
    .map((evidenceId) => auditCase.evidence.find((item) => item.id === evidenceId))
    .filter((item): item is { id: string; title: string } => Boolean(item));
  const relatedPrompts = auditCase.interviewPrompts.filter((prompt) =>
    prompt.revealsEvidenceIds?.some((evidenceId) => issue.relatedEvidence.includes(evidenceId)),
  );
  const relatedStakeholder = relatedPrompts
    .map((prompt) => auditCase.stakeholders.find((stakeholder) => stakeholder.id === prompt.stakeholderId)?.name)
    .find((name): name is string => Boolean(name));

  if (relatedPrompts.length > 0) {
    return {
      title: `Ask ${relatedStakeholder ?? "the stakeholder team"}`,
      detail:
        relatedEvidenceItems.length > 0
          ? `Use interviews to unlock ${relatedEvidenceItems.slice(0, 2).map((item) => item.title).join(", ")} and revisit ${issue.title}.`
          : `Use interviews to unlock the control story behind ${issue.title}.`,
      targetTab: "interviews",
    };
  }

  if (relatedEvidenceItems.length > 0) {
    return {
      title: `Inspect ${relatedEvidenceItems[0].title}`,
      detail:
        relatedEvidenceItems.length > 1
          ? `Open the evidence locker and cross-check ${relatedEvidenceItems.slice(0, 2).map((item) => item.title).join(", ")} against ${issue.title}.`
          : `Open the evidence locker and inspect the artifact tied to ${issue.title}.`,
      targetTab: "evidence",
      evidenceId: relatedEvidenceItems[0].id,
    };
  }

  return {
    title: "Revisit the case file",
    detail: `Return to the scope memo and control story for ${issue.title} before drafting again.`,
    targetTab: "caseFile",
  };
}

export function WorkstationScene() {
  const setScene = useGameStore((state) => state.setScene);
  const sfxVolume = useGameStore((state) => state.settings.sfxVolume);
  const auditCase = useAuditStore((state) => state.auditCase);
  const runMode = useAuditStore((state) => state.runMode);
  const runVariantProfile = useAuditStore((state) => state.runVariantProfile);
  const practiceFocusIssueIds = useAuditStore((state) => state.practiceFocusIssueIds);
  const practiceBrief = useAuditStore((state) => state.practiceBrief);
  const selectedEvidenceId = useAuditStore((state) => state.selectedEvidenceId);
  const reviewedEvidenceIds = useAuditStore((state) => state.reviewedEvidenceIds);
  const discoveredEvidenceIds = useAuditStore((state) => state.discoveredEvidenceIds);
  const interviewLogIds = useAuditStore((state) => state.interviewLogIds);
  const workstationTab = useAuditStore((state) => state.workstationTab);
  const setWorkstationTab = useAuditStore((state) => state.setWorkstationTab);
  const selectEvidence = useAuditStore((state) => state.selectEvidence);
  const markEvidenceReviewed = useAuditStore((state) => state.markEvidenceReviewed);
  const logInterviewPrompt = useAuditStore((state) => state.logInterviewPrompt);
  const draftedFindings = useAuditStore((state) => state.draftedFindings);
  const findingDraftForm = useAuditStore((state) => state.findingDraftForm);
  const updateFindingDraftForm = useAuditStore((state) => state.updateFindingDraftForm);
  const toggleLinkedEvidence = useAuditStore((state) => state.toggleLinkedEvidence);
  const addDraftFinding = useAuditStore((state) => state.addDraftFinding);
  const removeDraftFinding = useAuditStore((state) => state.removeDraftFinding);
  const submitReport = useAuditStore((state) => state.submitReport);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);

  const openHelpOverlay = () => {
    playConfirmTone(sfxVolume);
    setHelpOpen(true);
  };

  const closeHelpOverlay = () => {
    playBackTone(sfxVolume);
    setHelpOpen(false);
  };

  const openPauseOverlay = () => {
    playConfirmTone(sfxVolume);
    setPauseOpen(true);
  };

  const closePauseOverlay = () => {
    playBackTone(sfxVolume);
    setPauseOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (helpOpen) {
        return;
      }

      if (pauseOpen) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target !== null &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.tagName === "BUTTON" ||
          target.isContentEditable);

      if (isTypingTarget) {
        return;
      }

      if (event.key.toLowerCase() === "h" || event.key === "?") {
        event.preventDefault();
        openHelpOverlay();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        openPauseOverlay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [helpOpen, pauseOpen, sfxVolume]);

  const selectedEvidence = useMemo(
    () =>
      auditCase.evidence.find((item) => item.id === selectedEvidenceId) ?? auditCase.evidence[0],
    [auditCase.evidence, selectedEvidenceId],
  );

  const visibleEvidence = auditCase.evidence.filter((item) =>
    discoveredEvidenceIds.includes(item.id),
  );

  const groupedPrompts = auditCase.stakeholders.map((stakeholder) => ({
    stakeholder,
    prompts: auditCase.interviewPrompts.filter((prompt) => prompt.stakeholderId === stakeholder.id),
  }));

  const tabs = [
    { key: "inbox", label: "Inbox" },
    { key: "caseFile", label: "Case File" },
    { key: "interviews", label: "Interviews" },
    { key: "evidence", label: "Evidence" },
    { key: "findings", label: "Findings" },
  ] as const;

  const practiceFocusIssues = auditCase.issues.filter((issue) =>
    practiceFocusIssueIds.includes(issue.id),
  );
  const practiceFocusAction = useMemo(() => {
    const primaryAction = practiceBrief?.actionItems?.[0];

    if (primaryAction) {
      return {
        title: primaryAction.title,
        detail: primaryAction.detail,
        targetTab: primaryAction.targetTab,
      } satisfies PracticeReplayFocus;
    }

    if (practiceFocusIssues.length > 0) {
      return buildPracticeReplayFocus(
        {
          evidence: auditCase.evidence,
          interviewPrompts: auditCase.interviewPrompts,
          stakeholders: auditCase.stakeholders,
        },
        practiceFocusIssues[0],
      );
    }

    return DEFAULT_PRACTICE_REPLAY_FOCUS;
  }, [
    auditCase.evidence,
    auditCase.interviewPrompts,
    auditCase.stakeholders,
    practiceBrief?.actionItems,
    practiceFocusIssues,
  ]);

  const reviewedCount = visibleEvidence.filter((item) => reviewedEvidenceIds.includes(item.id)).length;
  const askedInterviewCount = auditCase.interviewPrompts.filter((prompt) =>
    interviewLogIds.includes(prompt.id),
  ).length;
  const selectedEvidenceIndex = visibleEvidence.findIndex((item) => item.id === selectedEvidence.id);
  const selectedEvidenceNumber = selectedEvidenceIndex >= 0 ? selectedEvidenceIndex + 1 : 1;

  return (
    <section className="scene scene-workstation">
      <div className="scene-card workstation-card wide workstation-wide">
        <div className="workstation-topbar">
          <div>
            <p className="eyebrow">Desk Terminal Online</p>
            <h1>{auditCase.title}</h1>
            <p className="office-brief workstation-lead">
              Review the inbox, cross-check the evidence locker, and turn the record trail into a
              defensible report.
            </p>
          </div>
          <div className="workstation-meta">
            <span>Deadline: {auditCase.deadlineDays} days</span>
            <span>Reviewed: {reviewedCount}/{visibleEvidence.length}</span>
            <span>Interviews: {askedInterviewCount}/{auditCase.interviewPrompts.length}</span>
            <span className="panel-chip">Variant: {runVariantProfile.label}</span>
            <button type="button" className="panel-chip panel-chip-button" onClick={openPauseOverlay}>
              Pause: Esc
            </button>
            <button type="button" className="panel-chip panel-chip-button" onClick={openHelpOverlay}>
              Help: H
            </button>
          </div>
        </div>

        {runMode === "practice" && (
          <section className="terminal-panel practice-banner">
            <div className="artifact-panel-header">
              <div>
                <p className="eyebrow">Practice Mode</p>
                <h2>{practiceBrief?.title ?? "Retry Missed Control Areas"}</h2>
              </div>
              <div className="panel-chip">Targeted Replay</div>
            </div>
            <p className="mail-body">
              {practiceBrief?.summary ??
                "This replay is focused on the issues you missed last time. Start with the guided route below, then trace the evidence and interviews tied to those control gaps."}
            </p>
            <div className="replay-focus-shell">
              <article className="study-review-card replay-focus-card">
                <div className="mail-header">
                  <strong>{practiceFocusAction.title}</strong>
                  <span>{getPracticeReplayTabLabel(practiceFocusAction.targetTab)}</span>
                </div>
                <p className="mail-body">{practiceFocusAction.detail}</p>
                <button
                  className="review-button"
                  onClick={() => {
                    if (practiceFocusAction.evidenceId) {
                      selectEvidence(practiceFocusAction.evidenceId);
                    }

                    setWorkstationTab(practiceFocusAction.targetTab);
                  }}
                >
                  Open {getPracticeReplayTabLabel(practiceFocusAction.targetTab)}
                </button>
              </article>

              <article className="study-review-card replay-focus-card">
                <div className="mail-header">
                  <strong>Missed issues</strong>
                  <span>{practiceFocusIssues.length}</span>
                </div>
                {practiceFocusIssues.length > 0 ? (
                  <ul className="bullet-list replay-issue-list">
                    {practiceFocusIssues.map((issue) => {
                      const issueReplay = buildPracticeReplayFocus(
                        {
                          evidence: auditCase.evidence,
                          interviewPrompts: auditCase.interviewPrompts,
                          stakeholders: auditCase.stakeholders,
                        },
                        issue,
                      );

                      return (
                        <li key={issue.id} className="replay-issue-item">
                          <div>
                            <strong>{issue.title}</strong>
                            <span>{issue.severity}</span>
                          </div>
                          <p>{issueReplay.detail}</p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="terminal-muted">
                    No replay issues were queued, so this run is using the broader learning path.
                  </p>
                )}
              </article>
            </div>
            {practiceBrief && practiceBrief.actionItems.length > 0 && (
              <div className="replay-action-grid workstation-drill-grid">
                {practiceBrief.actionItems.map((action, index) => (
                  <article
                    key={`${action.targetTab}:${index}`}
                    className="study-review-card adaptive-drill-card"
                  >
                    <div className="mail-header">
                      <strong>{action.title}</strong>
                      <span>{action.targetTab}</span>
                    </div>
                    <p className="mail-body">{action.detail}</p>
                    <button
                      className="review-button"
                      onClick={() => {
                        setWorkstationTab(action.targetTab);
                      }}
                    >
                      Open {getPracticeReplayTabLabel(action.targetTab)}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="workstation-console" aria-label="Case status summary">
          <div className="console-chip">
            <span className="console-label">Mode</span>
            <strong>
              {runMode === "practice"
                ? practiceBrief
                  ? "Adaptive Drill"
                  : "Practice Replay"
                : "Active Audit"}
            </strong>
          </div>
          <div className="console-chip">
            <span className="console-label">Inbox</span>
            <strong>{auditCase.inbox.length} records</strong>
          </div>
          <div className="console-chip">
            <span className="console-label">Evidence</span>
            <strong>{visibleEvidence.length} artifacts</strong>
          </div>
          <div className="console-chip">
            <span className="console-label">Findings</span>
            <strong>{draftedFindings.length} drafted</strong>
          </div>
        </div>

        <div className="workstation-tabs" role="tablist" aria-label="Workstation navigation">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`workstation-tab ${workstationTab === tab.key ? "active" : ""}`}
              onClick={() => setWorkstationTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {workstationTab === "inbox" && (
          <div className="terminal-panel-stack">
            <section className="terminal-panel artifact-intro-panel">
              <p className="terminal-kicker">Incoming audit messages</p>
              <p className="terminal-muted">
                Threads, replies, and status updates that shape the case timeline.
              </p>
            </section>
            {auditCase.inbox.map((message) => (
              <article key={message.id} className="mail-card message-card">
                <div className="artifact-banner">
                  <div>
                    <p className="artifact-label">Email Thread</p>
                    <h3>{message.subject}</h3>
                  </div>
                  <span className="artifact-tag">From {message.from}</span>
                </div>
                <div className="mail-meta-row">
                  <span>Sender</span>
                  <strong>{message.from}</strong>
                </div>
                <p className="mail-preview">{message.preview}</p>
                <div className="mail-body-shell">
                  <p className="mail-body">{message.body}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        {workstationTab === "caseFile" && (
          <div className="workstation-layout single">
            <section className="terminal-panel artifact-panel">
              <div className="artifact-banner">
                <div>
                  <p className="artifact-label">Case File</p>
                  <h2>Audit Objective</h2>
                </div>
                <span className="artifact-tag">Scope memo</span>
              </div>
              <p>{auditCase.objective}</p>
              <div className="case-record-grid">
                <div>
                  <h3>Scope</h3>
                  <ul className="bullet-list">
                    {auditCase.scope.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3>Control Families</h3>
                  <div className="tag-row">
                    {auditCase.controls.map((control) => (
                      <span key={control.id} className="tag-chip">
                        {control.framework}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="terminal-panel artifact-panel">
              <div className="artifact-banner">
                <div>
                  <p className="artifact-label">Records</p>
                  <h2>Stakeholders and Controls</h2>
                </div>
                <span className="artifact-tag">{auditCase.stakeholders.length} contacts</span>
              </div>
              <div className="record-stack">
                {auditCase.stakeholders.map((stakeholder) => (
                  <article key={stakeholder.id} className="record-card">
                    <div className="mail-meta-row">
                      <span>{stakeholder.department}</span>
                      <strong>{stakeholder.role}</strong>
                    </div>
                    <h3>{stakeholder.name}</h3>
                  </article>
                ))}
              </div>
              <h3>Controls In Scope</h3>
              <div className="record-stack compact">
                {auditCase.controls.map((control) => (
                  <article key={control.id} className="record-card compact">
                    <div className="mail-meta-row">
                      <span>{control.framework}</span>
                      <strong>{control.id}</strong>
                    </div>
                    <h3>{control.name}</h3>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {workstationTab === "interviews" && (
          <div className="terminal-panel-stack">
            {groupedPrompts.map(({ stakeholder, prompts }) => (
              <section key={stakeholder.id} className="terminal-panel interview-panel">
                <div className="artifact-banner">
                  <div>
                    <p className="artifact-label">Interview Log</p>
                    <h2>{stakeholder.name}</h2>
                  </div>
                  <span className="artifact-tag">{prompts.length} prompts</span>
                </div>
                <p className="terminal-muted">
                  {stakeholder.role} - {stakeholder.department}
                </p>

                <div className="interview-prompt-list">
                  {prompts.map((prompt) => {
                    const asked = interviewLogIds.includes(prompt.id);

                    return (
                      <article key={prompt.id} className="interview-card transcript-card">
                        <div className="interview-question-row">
                          <div className="transcript-question">
                            <span className="transcript-label">Q</span>
                            <strong>{prompt.question}</strong>
                          </div>
                          <button
                            className="review-button"
                            onClick={() => logInterviewPrompt(prompt.id)}
                          >
                            {asked ? "Asked" : "Ask"}
                          </button>
                        </div>

                        {asked && (
                          <div className="interview-answer transcript-answer">
                            <span className="transcript-label answer">A</span>
                            <p>{prompt.answer}</p>
                            {prompt.revealsEvidenceIds && prompt.revealsEvidenceIds.length > 0 && (
                              <p className="terminal-muted">
                                Evidence unlocked: {" "}
                                {prompt.revealsEvidenceIds
                                  .map((id) => auditCase.evidence.find((entry) => entry.id === id)?.title ?? id)
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {workstationTab === "evidence" && selectedEvidence && (
          <div className="workstation-layout">
            <aside className="terminal-panel evidence-sidebar artifact-panel">
              <div className="artifact-banner">
                <div>
                  <p className="artifact-label">Evidence Locker</p>
                  <h2>Artifacts</h2>
                </div>
                <span className="artifact-tag">Unlocked {visibleEvidence.length}</span>
              </div>
              <div className="evidence-list">
                {visibleEvidence.map((item) => {
                  const reviewed = reviewedEvidenceIds.includes(item.id);

                  return (
                    <button
                      key={item.id}
                      className={`evidence-list-item ${selectedEvidence.id === item.id ? "active" : ""}`}
                      onClick={() => selectEvidence(item.id)}
                    >
                      <span className="evidence-item-title">{item.title}</span>
                      <span className="evidence-item-subtitle">{getEvidenceArtifactLabel(item.type)}</span>
                      <span className={`evidence-status ${reviewed ? "reviewed" : ""}`}>
                        {reviewed ? "Reviewed" : item.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="terminal-panel evidence-detail artifact-panel">
              <div className="evidence-heading">
                <div>
                  <p className="artifact-label">Record Viewer</p>
                  <h2>{selectedEvidence.title}</h2>
                  <p className="terminal-muted">
                    {getEvidenceArtifactLabel(selectedEvidence.type)} - {selectedEvidence.type.toUpperCase()}
                  </p>
                </div>
                <button
                  className="review-button"
                  onClick={() => markEvidenceReviewed(selectedEvidence.id)}
                >
                  {reviewedEvidenceIds.includes(selectedEvidence.id) ? "Reviewed" : "Mark Reviewed"}
                </button>
              </div>

              <div className="record-sheet">
                <div className="mail-meta-row">
                  <span>Artifact ID</span>
                  <strong>
                    {selectedEvidence.id} / {selectedEvidenceNumber.toString().padStart(2, "0")}
                  </strong>
                </div>
                <p>{selectedEvidence.content}</p>
              </div>

              <div className="evidence-meta">
                <div>
                  <h3>Related Controls</h3>
                  <ul className="bullet-list">
                    {selectedEvidence.relatedControls.map((controlId) => {
                      const control = auditCase.controls.find((item) => item.id === controlId);
                      return <li key={controlId}>{control?.name ?? controlId}</li>;
                    })}
                  </ul>
                </div>
                <div>
                  <h3>Tags</h3>
                  <div className="tag-row">
                    {selectedEvidence.tags.map((tag) => (
                      <span key={tag} className="tag-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {workstationTab === "findings" && (
          <div className="workstation-layout single">
            <section className="terminal-panel artifact-intro-panel">
              <p className="terminal-kicker">Audit Memo Frame</p>
              <p className="terminal-muted">
                Keep each finding in a defensible memo structure: condition, criteria, cause, effect,
                and recommendation. The legacy description field still acts as the condition line.
              </p>
            </section>
            <section className="terminal-panel artifact-panel">
              <div className="artifact-banner">
                <div>
                  <p className="artifact-label">Findings Notebook</p>
                  <h2>Draft Memo</h2>
                </div>
                <span className="artifact-tag">{draftedFindings.length} entries</span>
              </div>
              <div className="finding-form-grid">
                <label className="option-row">
                  <span>Finding Title</span>
                  <input
                    type="text"
                    value={findingDraftForm.title}
                    onChange={(event) => updateFindingDraftForm({ title: event.target.value })}
                    placeholder="Failure to Deprovision User"
                  />
                </label>

                <label className="option-row">
                  <span>Severity</span>
                  <select
                    value={findingDraftForm.severity}
                    onChange={(event) =>
                      updateFindingDraftForm({
                        severity: event.target.value as "Low" | "Medium" | "High",
                      })
                    }
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </label>
              </div>

              <label className="option-row">
                <span>Condition / Observation</span>
                <textarea
                  className="terminal-textarea"
                  value={findingDraftForm.condition}
                  onChange={(event) => updateFindingDraftForm({ condition: event.target.value })}
                  placeholder="Describe the condition observed during testing."
                />
              </label>

              <label className="option-row">
                <span>Criteria</span>
                <textarea
                  className="terminal-textarea"
                  value={findingDraftForm.criteria}
                  onChange={(event) => updateFindingDraftForm({ criteria: event.target.value })}
                  placeholder="Describe the policy, standard, or expected control behavior."
                />
              </label>

              <label className="option-row">
                <span>Cause</span>
                <textarea
                  className="terminal-textarea"
                  value={findingDraftForm.cause}
                  onChange={(event) => updateFindingDraftForm({ cause: event.target.value })}
                  placeholder="Describe why the condition occurred."
                />
              </label>

              <label className="option-row">
                <span>Effect</span>
                <textarea
                  className="terminal-textarea"
                  value={findingDraftForm.effect}
                  onChange={(event) => updateFindingDraftForm({ effect: event.target.value })}
                  placeholder="Describe the risk, impact, or consequence."
                />
              </label>

              <label className="option-row">
                <span>Recommendation</span>
                <textarea
                  className="terminal-textarea"
                  value={findingDraftForm.recommendation}
                  onChange={(event) => updateFindingDraftForm({ recommendation: event.target.value })}
                  placeholder="Describe the remediation you expect management to implement."
                />
              </label>

              <div className="option-row">
                <span>Link Evidence</span>
                <div className="evidence-checkbox-grid">
                  {auditCase.evidence.map((item) => (
                    <label
                      key={item.id}
                      className={`evidence-checkbox ${discoveredEvidenceIds.includes(item.id) ? "" : "locked"}`}
                    >
                      <input
                        type="checkbox"
                        checked={findingDraftForm.linkedEvidenceIds.includes(item.id)}
                        onChange={() => toggleLinkedEvidence(item.id)}
                        disabled={!discoveredEvidenceIds.includes(item.id)}
                      />
                      <span>
                        {item.title}
                        {!discoveredEvidenceIds.includes(item.id) ? " (Interview to unlock)" : ""}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="results-actions">
                <button className="menu-button selected" onClick={() => addDraftFinding()}>
                  <span className="menu-indicator">+</span>
                  <span>Add Finding</span>
                </button>
                <button
                  className="menu-button"
                  onClick={() => {
                    submitReport();
                    setScene("results");
                  }}
                  disabled={draftedFindings.length === 0}
                >
                  <span className="menu-indicator">&gt;</span>
                  <span>Submit Report</span>
                </button>
              </div>
            </section>

            <section className="terminal-panel artifact-panel">
              <div className="artifact-banner">
                <div>
                  <p className="artifact-label">Draft Queue</p>
                  <h2>Working Papers</h2>
                </div>
                <span className="artifact-tag">Ready for review</span>
              </div>
              {draftedFindings.length === 0 && (
                <p className="terminal-muted">No drafted findings yet. Add at least one before submitting.</p>
              )}
              <div className="terminal-panel-stack">
                {draftedFindings.map((finding) => (
                  <article key={finding.id} className="finding-card memo-card">
                    <div className="mail-header">
                      <strong>{finding.title}</strong>
                      <span>{finding.severity}</span>
                    </div>
                    <div className="finding-memo-grid">
                      <article className="finding-memo-card">
                        <span>Condition</span>
                        <p>{finding.description || "Not stated."}</p>
                      </article>
                      <article className="finding-memo-card">
                        <span>Criteria</span>
                        <p>{finding.criteria || "Not stated."}</p>
                      </article>
                      <article className="finding-memo-card">
                        <span>Cause</span>
                        <p>{finding.cause || "Not stated."}</p>
                      </article>
                      <article className="finding-memo-card">
                        <span>Effect</span>
                        <p>{finding.effect || "Not stated."}</p>
                      </article>
                      <article className="finding-memo-card wide">
                        <span>Recommendation</span>
                        <p>{finding.recommendation || "Not stated."}</p>
                      </article>
                    </div>
                    <p className="terminal-muted finding-memo-evidence">
                      Evidence:{" "}
                      {finding.linkedEvidenceIds.length > 0
                        ? finding.linkedEvidenceIds
                            .map((id) => auditCase.evidence.find((entry) => entry.id === id)?.title ?? id)
                            .join(", ")
                        : "None linked."}
                    </p>
                    <button className="text-button" onClick={() => removeDraftFinding(finding.id)}>
                      Delete
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        <button className="menu-button selected workstation-exit" onClick={() => setScene("office")}>
          <span className="menu-indicator">&lt;</span>
          <span>Leave Computer</span>
        </button>

        {helpOpen && (
          <SceneHelpOverlay
            title="Desk Terminal Guide"
            intro="This overlay pauses the terminal and explains how to move through the audit workflow without leaving the game shell."
            actionLabel="Resume Terminal"
            footer="Press Esc or use the resume button to continue working the case."
            sections={[
              {
                title: "Core Flow",
                items: [
                  "Open the inbox and case file first to orient yourself.",
                  "Use interviews to unlock evidence and follow the trail.",
                  "Draft findings, link supporting artifacts, and submit when the report is ready.",
                ],
              },
              {
                title: "Controls",
                items: [
                  "Click tabs to switch between inbox, case file, interviews, evidence, and findings.",
                  "Click Ask to log an interview prompt and reveal more evidence.",
                  "Use the Help button or press H to reopen this guide later.",
                ],
              },
              {
                title: "Practice Mode",
                items: [
                  "Practice replay focuses the run on the control areas you missed last time.",
                  "The workstation highlights the replay focus so you can study those gaps on purpose.",
                ],
              },
            ]}
            onClose={closeHelpOverlay}
          />
        )}

        {pauseOpen && (
          <ScenePauseOverlay
            title="Desk Terminal Paused"
            intro="Freeze the audit shell, change your session settings, and return to the same evidence trail when you are ready."
            resumeLabel="Resume Terminal"
            secondaryActionLabel="Leave Computer"
            secondaryActionHint="Leaving the workstation returns you to the office floor without clearing your case progress."
            onResume={closePauseOverlay}
            onSecondaryAction={() => {
              closePauseOverlay();
              setScene("office");
            }}
          />
        )}
      </div>
    </section>
  );
}
