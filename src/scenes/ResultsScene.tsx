import { useAuditStore } from "../store/useAuditStore";
import { useGameStore } from "../store/useGameStore";

function getRank(score: number) {
  if (score >= 85) return "Audit Lead";
  if (score >= 65) return "Senior Auditor";
  if (score >= 45) return "Junior Auditor";
  return "Trainee Auditor";
}

export function ResultsScene() {
  const setScene = useGameStore((state) => state.setScene);
  const resetOfficeState = useGameStore((state) => state.resetOfficeState);
  const auditCase = useAuditStore((state) => state.auditCase);
  const finalScore = useAuditStore((state) => state.finalScore);
  const draftedFindings = useAuditStore((state) => state.draftedFindings);
  const resetAuditProgress = useAuditStore((state) => state.resetAuditProgress);

  if (!finalScore) {
    return (
      <section className="scene scene-results">
        <div className="scene-card workstation-card">
          <p className="eyebrow">Report Status</p>
          <h1>NO REPORT YET</h1>
          <button className="menu-button selected" onClick={() => setScene("workstation")}>
            <span className="menu-indicator">&lt;</span>
            <span>Return to Workstation</span>
          </button>
        </div>
      </section>
    );
  }

  const matchedIssues = auditCase.issues.filter((issue) => finalScore.matchedIssueIds.includes(issue.id));
  const missedIssues = auditCase.issues.filter((issue) => finalScore.missedIssueIds.includes(issue.id));
  const unsupportedFindings = draftedFindings.filter((finding) =>
    finalScore.unsupportedFindingIds.includes(finding.id),
  );

  return (
    <section className="scene scene-results">
      <div className="scene-card wide workstation-wide">
        <div className="workstation-topbar">
          <div>
            <p className="eyebrow">Final Audit Review</p>
            <h1>RESULTS</h1>
          </div>
          <div className="score-badge">
            <strong>{finalScore.score}/100</strong>
            <span>{getRank(finalScore.score)}</span>
          </div>
        </div>

        <div className="results-grid">
          <section className="terminal-panel">
            <h2>Correctly Identified</h2>
            <ul className="bullet-list">
              {matchedIssues.length > 0 ? (
                matchedIssues.map((issue) => (
                  <li key={issue.id}>
                    <strong>{issue.title}</strong> - {issue.severity}
                  </li>
                ))
              ) : (
                <li>No expected issues matched yet.</li>
              )}
            </ul>
          </section>

          <section className="terminal-panel">
            <h2>Missed Issues</h2>
            <ul className="bullet-list">
              {missedIssues.length > 0 ? (
                missedIssues.map((issue) => (
                  <li key={issue.id}>
                    <strong>{issue.title}</strong> - {issue.severity}
                  </li>
                ))
              ) : (
                <li>You captured all expected issues.</li>
              )}
            </ul>
          </section>

          <section className="terminal-panel">
            <h2>Severity Mismatches</h2>
            <ul className="bullet-list">
              {finalScore.severityMismatches.length > 0 ? (
                finalScore.severityMismatches.map((issueId) => {
                  const issue = auditCase.issues.find((entry) => entry.id === issueId);
                  return <li key={issueId}>{issue?.title ?? issueId}</li>;
                })
              ) : (
                <li>No severity mismatches.</li>
              )}
            </ul>
          </section>

          <section className="terminal-panel">
            <h2>Unsupported Findings</h2>
            <ul className="bullet-list">
              {unsupportedFindings.length > 0 ? (
                unsupportedFindings.map((finding) => (
                  <li key={finding.id}>{finding.title}</li>
                ))
              ) : (
                <li>No unsupported findings.</li>
              )}
            </ul>
          </section>
        </div>

        <div className="results-actions">
          <button
            className="menu-button"
            onClick={() => {
              setScene("workstation");
            }}
          >
            <span className="menu-indicator">&lt;</span>
            <span>Back to Workstation</span>
          </button>
          <button
            className="menu-button selected"
            onClick={() => {
              resetAuditProgress();
              resetOfficeState();
              setScene("mainMenu");
            }}
          >
            <span className="menu-indicator">&gt;</span>
            <span>Return to Main Menu</span>
          </button>
        </div>
      </div>
    </section>
  );
}
