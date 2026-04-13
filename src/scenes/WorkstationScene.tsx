import { useMemo } from "react";
import { useAuditStore } from "../store/useAuditStore";
import { useGameStore } from "../store/useGameStore";

export function WorkstationScene() {
  const setScene = useGameStore((state) => state.setScene);
  const auditCase = useAuditStore((state) => state.auditCase);
  const runMode = useAuditStore((state) => state.runMode);
  const practiceFocusIssueIds = useAuditStore((state) => state.practiceFocusIssueIds);
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

  return (
    <section className="scene scene-workstation">
      <div className="scene-card workstation-card wide workstation-wide">
        <div className="workstation-topbar">
          <div>
            <p className="eyebrow">Desk Terminal Online</p>
            <h1>{auditCase.title}</h1>
          </div>
          <div className="workstation-meta">
            <span>Deadline: {auditCase.deadlineDays} days</span>
            <span>Reviewed: {reviewedEvidenceIds.length}/{visibleEvidence.length}</span>
          </div>
        </div>

        {runMode === "practice" && (
          <section className="terminal-panel practice-banner">
            <p className="eyebrow">Practice Mode</p>
            <h2>Retry Missed Control Areas</h2>
            <p className="mail-body">
              This replay is focused on the issues you missed last time. Start with the case file,
              then trace the evidence and interviews tied to those control gaps.
            </p>
            {practiceFocusIssues.length > 0 && (
              <ul className="bullet-list">
                {practiceFocusIssues.map((issue) => (
                  <li key={issue.id}>
                    <strong>{issue.title}</strong> - {issue.severity}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

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
            {auditCase.inbox.map((message) => (
              <article key={message.id} className="mail-card">
                <div className="mail-header">
                  <strong>{message.subject}</strong>
                  <span>{message.from}</span>
                </div>
                <p className="mail-preview">{message.preview}</p>
                <p className="mail-body">{message.body}</p>
              </article>
            ))}
          </div>
        )}

        {workstationTab === "caseFile" && (
          <div className="workstation-layout single">
            <section className="terminal-panel">
              <h2>Audit Objective</h2>
              <p>{auditCase.objective}</p>
              <h3>Scope</h3>
              <ul className="bullet-list">
                {auditCase.scope.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="terminal-panel">
              <h2>Stakeholders</h2>
              <ul className="bullet-list">
                {auditCase.stakeholders.map((stakeholder) => (
                  <li key={stakeholder.id}>
                    <strong>{stakeholder.name}</strong> - {stakeholder.role} ({stakeholder.department})
                  </li>
                ))}
              </ul>
              <h3>Controls In Scope</h3>
              <ul className="bullet-list">
                {auditCase.controls.map((control) => (
                  <li key={control.id}>
                    <strong>{control.name}</strong> - {control.framework}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {workstationTab === "interviews" && (
          <div className="terminal-panel-stack">
            {groupedPrompts.map(({ stakeholder, prompts }) => (
              <section key={stakeholder.id} className="terminal-panel">
                <h2>{stakeholder.name}</h2>
                <p className="terminal-muted">
                  {stakeholder.role} - {stakeholder.department}
                </p>

                <div className="interview-prompt-list">
                  {prompts.map((prompt) => {
                    const asked = interviewLogIds.includes(prompt.id);

                    return (
                      <article key={prompt.id} className="interview-card">
                        <div className="interview-question-row">
                          <strong>{prompt.question}</strong>
                          <button
                            className="review-button"
                            onClick={() => logInterviewPrompt(prompt.id)}
                          >
                            {asked ? "Asked" : "Ask"}
                          </button>
                        </div>

                        {asked && (
                          <div className="interview-answer">
                            <p>{prompt.answer}</p>
                            {prompt.revealsEvidenceIds && prompt.revealsEvidenceIds.length > 0 && (
                              <p className="terminal-muted">
                                Evidence unlocked:{" "}
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
            <aside className="terminal-panel evidence-sidebar">
              <h2>Evidence Locker</h2>
              <div className="evidence-list">
                {visibleEvidence.map((item) => {
                  const reviewed = reviewedEvidenceIds.includes(item.id);

                  return (
                    <button
                      key={item.id}
                      className={`evidence-list-item ${selectedEvidence.id === item.id ? "active" : ""}`}
                      onClick={() => selectEvidence(item.id)}
                    >
                      <span>{item.title}</span>
                      <span className={`evidence-status ${reviewed ? "reviewed" : ""}`}>
                        {reviewed ? "Reviewed" : item.type}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="terminal-panel evidence-detail">
              <div className="evidence-heading">
                <div>
                  <h2>{selectedEvidence.title}</h2>
                  <p className="terminal-muted">{selectedEvidence.type.toUpperCase()}</p>
                </div>
                <button
                  className="review-button"
                  onClick={() => markEvidenceReviewed(selectedEvidence.id)}
                >
                  {reviewedEvidenceIds.includes(selectedEvidence.id) ? "Reviewed" : "Mark Reviewed"}
                </button>
              </div>

              <p>{selectedEvidence.content}</p>

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
                      <span key={tag} className="tag-chip">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {workstationTab === "findings" && (
          <div className="workstation-layout single">
            <section className="terminal-panel">
              <h2>Findings Notebook</h2>
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
                <span>Description</span>
                <textarea
                  className="terminal-textarea"
                  value={findingDraftForm.description}
                  onChange={(event) => updateFindingDraftForm({ description: event.target.value })}
                  placeholder="Describe the condition observed during testing."
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

            <section className="terminal-panel">
              <h2>Drafted Findings</h2>
              {draftedFindings.length === 0 && (
                <p className="terminal-muted">No drafted findings yet. Add at least one before submitting.</p>
              )}
              <div className="terminal-panel-stack">
                {draftedFindings.map((finding) => (
                  <article key={finding.id} className="finding-card">
                    <div className="mail-header">
                      <strong>{finding.title}</strong>
                      <span>{finding.severity}</span>
                    </div>
                    <p className="mail-body">{finding.description}</p>
                    {finding.linkedEvidenceIds.length > 0 && (
                      <p className="terminal-muted">
                        Evidence:{" "}
                        {finding.linkedEvidenceIds
                          .map((id) => auditCase.evidence.find((entry) => entry.id === id)?.title ?? id)
                          .join(", ")}
                      </p>
                    )}
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
      </div>
    </section>
  );
}
