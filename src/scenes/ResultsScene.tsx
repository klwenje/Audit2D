import { useAuditStore } from "../store/useAuditStore";
import { useGameStore } from "../store/useGameStore";

function getRank(score: number) {
  if (score >= 85) return "Audit Lead";
  if (score >= 65) return "Senior Auditor";
  if (score >= 45) return "Junior Auditor";
  return "Trainee Auditor";
}

function getPerformanceHeadline(score: number) {
  if (score >= 85) return "Strong control story and well-supported reporting.";
  if (score >= 65) return "Solid audit instincts with a few missed opportunities.";
  if (score >= 45) return "Promising fieldwork, but support and severity need tightening.";
  return "Early-stage audit judgment. More corroboration is needed.";
}

function getPerformanceNarrative(
  score: number,
  matchedCount: number,
  missedCount: number,
  unsupportedCount: number,
) {
  if (score >= 85) {
    return `You identified ${matchedCount} key issues and kept unsupported reporting under control. This reads like a disciplined audit closeout with credible support.`;
  }

  if (score >= 65) {
    return `You captured ${matchedCount} issues, but ${missedCount} important items still slipped through. The fundamentals are there, and the next improvement is tighter follow-through.`;
  }

  if (score >= 45) {
    return `You surfaced some real risk, but the report still feels incomplete. Missed issues and weaker support are holding the audit back from a stronger conclusion.`;
  }

  return `The engagement needs more evidence-backed judgment. Too many control gaps were missed or weakly supported to make the report persuasive.`;
}

function getSeverityLabel(count: number, label: string) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

export function ResultsScene() {
  const setScene = useGameStore((state) => state.setScene);
  const resetOfficeState = useGameStore((state) => state.resetOfficeState);
  const auditCase = useAuditStore((state) => state.auditCase);
  const finalScore = useAuditStore((state) => state.finalScore);
  const draftedFindings = useAuditStore((state) => state.draftedFindings);
  const reviewedEvidenceIds = useAuditStore((state) => state.reviewedEvidenceIds);
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
  const rank = getRank(finalScore.score);
  const headline = getPerformanceHeadline(finalScore.score);
  const narrative = getPerformanceNarrative(
    finalScore.score,
    matchedIssues.length,
    missedIssues.length,
    unsupportedFindings.length,
  );
  const draftedHigh = draftedFindings.filter((finding) => finding.severity === "High").length;
  const draftedMedium = draftedFindings.filter((finding) => finding.severity === "Medium").length;
  const draftedLow = draftedFindings.filter((finding) => finding.severity === "Low").length;

  return (
    <section className="scene scene-results">
      <div className="scene-card wide workstation-wide">
        <div className="workstation-topbar">
          <div>
            <p className="eyebrow">Final Audit Review</p>
            <h1>RESULTS</h1>
            <p className="scene-copy report-lead">{headline}</p>
          </div>
          <div className="score-badge">
            <strong>{finalScore.score}/100</strong>
            <span>{rank}</span>
          </div>
        </div>

        <section className="terminal-panel report-summary-panel">
          <div className="report-summary-header">
            <div>
              <p className="eyebrow">Executive Summary</p>
              <h2>{auditCase.title}</h2>
            </div>
            <div className="report-chip">{rank}</div>
          </div>

          <p className="report-summary-copy">{narrative}</p>

          <div className="summary-metrics">
            <article className="summary-metric">
              <span className="metric-label">Issues Matched</span>
              <strong>{matchedIssues.length}</strong>
            </article>
            <article className="summary-metric">
              <span className="metric-label">Issues Missed</span>
              <strong>{missedIssues.length}</strong>
            </article>
            <article className="summary-metric">
              <span className="metric-label">Unsupported Findings</span>
              <strong>{unsupportedFindings.length}</strong>
            </article>
            <article className="summary-metric">
              <span className="metric-label">Evidence Reviewed</span>
              <strong>{reviewedEvidenceIds.length}</strong>
            </article>
          </div>
        </section>

        <section className="terminal-panel report-closeout-panel">
          <p className="eyebrow">Final Report Note</p>
          <div className="report-closeout-grid">
            <div>
              <h3>Management Message</h3>
              <p>{auditCase.closeout.managementMessage}</p>
            </div>
            <div>
              <h3>Auditor Reflection</h3>
              <p>{auditCase.closeout.auditorReflection}</p>
            </div>
          </div>
        </section>

        <section className="report-sheet" aria-label="Printable audit report">
          <div className="report-sheet-header">
            <div>
              <p className="report-sheet-kicker">Internal Audit Report</p>
              <h2>{auditCase.title}</h2>
              <p className="report-sheet-meta">
                Audit Outcome: {rank} | Score: {finalScore.score}/100
              </p>
            </div>
            <button className="print-report-button" onClick={() => window.print()}>
              Print Report
            </button>
          </div>

          <div className="report-sheet-section">
            <h3>Objective</h3>
            <p>{auditCase.objective}</p>
          </div>

          <div className="report-sheet-section">
            <h3>Executive Summary</h3>
            <p>{narrative}</p>
          </div>

          <div className="report-sheet-section report-sheet-grid">
            <div>
              <h3>Scope</h3>
              <ul className="bullet-list report-sheet-list">
                {auditCase.scope.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Report Metrics</h3>
              <ul className="bullet-list report-sheet-list">
                <li>{getSeverityLabel(draftedHigh, "High finding")}</li>
                <li>{getSeverityLabel(draftedMedium, "Medium finding")}</li>
                <li>{getSeverityLabel(draftedLow, "Low finding")}</li>
                <li>{reviewedEvidenceIds.length} evidence items reviewed</li>
              </ul>
            </div>
          </div>

          <div className="report-sheet-section">
            <h3>Drafted Findings</h3>
            {draftedFindings.length > 0 ? (
              <div className="report-finding-stack">
                {draftedFindings.map((finding, index) => (
                  <article key={finding.id} className="report-finding">
                    <div className="report-finding-header">
                      <strong>
                        {index + 1}. {finding.title}
                      </strong>
                      <span>{finding.severity}</span>
                    </div>
                    <p><strong>Condition:</strong> {finding.description}</p>
                    <p><strong>Recommendation:</strong> {finding.recommendation || "No recommendation provided."}</p>
                    <p>
                      <strong>Evidence:</strong>{" "}
                      {finding.linkedEvidenceIds.length > 0
                        ? finding.linkedEvidenceIds
                            .map((id) => auditCase.evidence.find((entry) => entry.id === id)?.title ?? id)
                            .join(", ")
                        : "None linked."}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p>No findings were drafted for this engagement.</p>
            )}
          </div>
        </section>

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
