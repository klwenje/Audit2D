import { useMemo } from "react";
import { useAuditStore } from "../store/useAuditStore";
import { useGameStore } from "../store/useGameStore";

export function WorkstationScene() {
  const setScene = useGameStore((state) => state.setScene);
  const auditCase = useAuditStore((state) => state.auditCase);
  const selectedEvidenceId = useAuditStore((state) => state.selectedEvidenceId);
  const reviewedEvidenceIds = useAuditStore((state) => state.reviewedEvidenceIds);
  const workstationTab = useAuditStore((state) => state.workstationTab);
  const setWorkstationTab = useAuditStore((state) => state.setWorkstationTab);
  const selectEvidence = useAuditStore((state) => state.selectEvidence);
  const markEvidenceReviewed = useAuditStore((state) => state.markEvidenceReviewed);

  const selectedEvidence = useMemo(
    () =>
      auditCase.evidence.find((item) => item.id === selectedEvidenceId) ?? auditCase.evidence[0],
    [auditCase.evidence, selectedEvidenceId],
  );

  const tabs = [
    { key: "inbox", label: "Inbox" },
    { key: "caseFile", label: "Case File" },
    { key: "evidence", label: "Evidence" },
    { key: "findings", label: "Findings" },
  ] as const;

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
            <span>Reviewed: {reviewedEvidenceIds.length}/{auditCase.evidence.length}</span>
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

        {workstationTab === "evidence" && selectedEvidence && (
          <div className="workstation-layout">
            <aside className="terminal-panel evidence-sidebar">
              <h2>Evidence Locker</h2>
              <div className="evidence-list">
                {auditCase.evidence.map((item) => {
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
              <p>
                This notebook comes online in the next slice. For now, use the case file and evidence
                views to understand the control story before we add draft findings, severity selection,
                and recommendations.
              </p>
              <div className="workstation-grid compact">
                <div className="workstation-panel">
                  Reviewed Evidence
                  <strong>{reviewedEvidenceIds.length}</strong>
                </div>
                <div className="workstation-panel">
                  Controls in Scope
                  <strong>{auditCase.controls.length}</strong>
                </div>
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
