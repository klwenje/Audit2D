import { useEffect, useMemo, useRef, useState } from "react";
import { useAuditStore } from "../store/useAuditStore";
import { useGameStore } from "../store/useGameStore";
import { SceneHelpOverlay } from "../components/SceneHelpOverlay";
import { ScenePauseOverlay } from "../components/ScenePauseOverlay";
import { CareerProgressPanel } from "../components/CareerProgressPanel";
import { buildCaseCatalog } from "../utils/caseCatalog";
import { buildAdaptivePracticeBrief } from "../utils/remediationDrill";
import { clearSaveData } from "../utils/saveData";
import { playBackTone, playConfirmTone } from "../utils/audio";
import {
  clearPracticeReplay,
  getCareerProgressSummary,
  getCaseMasteryStats,
  getStudyMomentumSummary,
  queuePracticeReplay,
  recordCaseStudyRun,
} from "../utils/studyProgress";

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
  wellSupportedCount: number,
  thinSupportedCount: number,
  unsupportedCount: number,
) {
  if (score >= 85) {
    return `You identified ${matchedCount} key issues, with ${wellSupportedCount} findings backed by the right evidence. This reads like a disciplined audit closeout, though ${thinSupportedCount} findings still need tighter support discipline.`;
  }

  if (score >= 65) {
    return `You captured ${matchedCount} issues, but ${missedCount} important items still slipped through. ${wellSupportedCount} findings were well evidenced, while ${thinSupportedCount} were only partly supported.`;
  }

  if (score >= 45) {
    return `You surfaced some real risk, but the report still feels incomplete. ${unsupportedCount} unsupported findings and ${thinSupportedCount} thinly supported findings are holding the audit back from a stronger conclusion.`;
  }

  return `The engagement needs more evidence-backed judgment. Too many control gaps were missed or weakly supported to make the report persuasive, and only ${wellSupportedCount} findings were clearly backed by artifacts.`;
}

function getSeverityLabel(count: number, label: string) {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function getNextStepAdvice(
  score: number,
  missedCount: number,
  unsupportedCount: number,
  thinSupportedCount: number,
) {
  if (score >= 85) {
    return "Push into harder cases next. Your next gain will come from spotting edge cases earlier and tightening report language.";
  }

  if (unsupportedCount > 0) {
    return "Focus on evidence discipline. Before writing a finding, make sure you can point to the exact document, extract, or interview support behind it.";
  }

  if (thinSupportedCount > 0) {
    return "Focus on proof quality. Some findings were directionally right but not anchored to the exact artifacts that justify the claim.";
  }

  if (missedCount > 0) {
    return "Focus on coverage discipline. Use the scope and controls list as a checklist so each control objective gets tested before you conclude fieldwork.";
  }

  return "Focus on severity calibration. Compare business impact, frequency, and control breakdown so your ratings match the actual risk story.";
}

export function ResultsScene() {
  const setScene = useGameStore((state) => state.setScene);
  const resetOfficeState = useGameStore((state) => state.resetOfficeState);
  const sfxVolume = useGameStore((state) => state.settings.sfxVolume);
  const availableCases = useAuditStore((state) => state.availableCases);
  const auditCase = useAuditStore((state) => state.auditCase);
  const finalScore = useAuditStore((state) => state.finalScore);
  const runDifficulty = useAuditStore((state) => state.runDifficulty);
  const draftedFindings = useAuditStore((state) => state.draftedFindings);
  const reviewedEvidenceIds = useAuditStore((state) => state.reviewedEvidenceIds);
  const resetAuditProgress = useAuditStore((state) => state.resetAuditProgress);
  const beginPracticeCase = useAuditStore((state) => state.beginPracticeCase);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const didRecordRunRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!finalScore) {
      return;
    }

    const runKey = `${auditCase.id}:${finalScore.score}:${finalScore.missedIssueIds.join("|")}`;
    if (didRecordRunRef.current === runKey) {
      return;
    }

    didRecordRunRef.current = runKey;
    const controlCoverage = auditCase.controls.map((control) => {
      const relatedIssues = auditCase.issues.filter((issue) =>
        issue.relatedEvidence.some((evidenceId) =>
          auditCase.evidence.find((evidence) => evidence.id === evidenceId)?.relatedControls.includes(control.id),
        ),
      );

      return {
        matchedIssues: relatedIssues.filter((issue) => finalScore.matchedIssueIds.includes(issue.id)),
      };
    });
    const coveredControlCount = controlCoverage.filter((entry) => entry.matchedIssues.length > 0).length;

    recordCaseStudyRun(auditCase.id, finalScore.score, finalScore.missedIssueIds, {
      runDifficulty,
      unsupportedCount: finalScore.unsupportedFindingIds.length,
      thinSupportedCount: finalScore.thinSupportedFindingIds.length,
      coveredControlCount,
      totalControls: auditCase.controls.length,
    });
  }, [auditCase, finalScore, runDifficulty]);

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
  const wellSupportedFindings = draftedFindings.filter((finding) =>
    finalScore.wellSupportedFindingIds.includes(finding.id),
  );
  const thinSupportedFindings = draftedFindings.filter((finding) =>
    finalScore.thinSupportedFindingIds.includes(finding.id),
  );
  const rank = getRank(finalScore.score);
  const headline = getPerformanceHeadline(finalScore.score);
  const narrative = getPerformanceNarrative(
    finalScore.score,
    matchedIssues.length,
    missedIssues.length,
    wellSupportedFindings.length,
    thinSupportedFindings.length,
    unsupportedFindings.length,
  );
  const draftedHigh = draftedFindings.filter((finding) => finding.severity === "High").length;
  const draftedMedium = draftedFindings.filter((finding) => finding.severity === "Medium").length;
  const draftedLow = draftedFindings.filter((finding) => finding.severity === "Low").length;
  const nextStepAdvice = getNextStepAdvice(
    finalScore.score,
    missedIssues.length,
    unsupportedFindings.length,
    thinSupportedFindings.length,
  );
  const adaptivePracticeBrief = useMemo(
    () => buildAdaptivePracticeBrief(auditCase, finalScore, draftedFindings),
    [auditCase, draftedFindings, finalScore],
  );
  const caseMastery = getCaseMasteryStats(auditCase.id);
  const projectedRuns = caseMastery.timesPlayed + 1;
  const projectedBestScore =
    caseMastery.bestScore === null ? finalScore.score : Math.max(caseMastery.bestScore, finalScore.score);
  const caseCatalog = useMemo(() => buildCaseCatalog(availableCases), [availableCases]);
  const careerSummary = useMemo(
    () =>
      getCareerProgressSummary(caseCatalog, {
        caseId: auditCase.id,
        score: finalScore.score,
        missedIssueIds: finalScore.missedIssueIds,
      }),
    [auditCase.id, caseCatalog, finalScore.missedIssueIds, finalScore.score],
  );
  const studyMomentum = useMemo(
    () =>
      getStudyMomentumSummary(
        availableCases.map((auditCaseEntry) => auditCaseEntry.id),
        {
          caseId: auditCase.id,
          score: finalScore.score,
          missedIssueIds: finalScore.missedIssueIds,
        },
      ),
    [auditCase.id, availableCases, finalScore.missedIssueIds, finalScore.score],
  );
  const strongestCaseLabel = useMemo(() => {
    const strongestCase = studyMomentum.strongestCase;
    if (!strongestCase) {
      return "No scored case yet";
    }

    return (
      availableCases.find((auditCaseEntry) => auditCaseEntry.id === strongestCase.caseId)?.title ??
      strongestCase.caseId
    );
  }, [availableCases, studyMomentum.strongestCase]);
  const mostReplayedCaseLabel = useMemo(() => {
    const mostReplayedCase = studyMomentum.mostReplayedCase;
    if (!mostReplayedCase) {
      return "No replay loop yet";
    }

    return (
      availableCases.find((auditCaseEntry) => auditCaseEntry.id === mostReplayedCase.caseId)?.title ??
      mostReplayedCase.caseId
    );
  }, [availableCases, studyMomentum.mostReplayedCase]);
  const averageBestScoreLabel =
    studyMomentum.averageBestScore === null ? "—" : `${studyMomentum.averageBestScore}/100`;
  const controlCoverage = auditCase.controls.map((control) => {
    const relatedIssues = auditCase.issues.filter((issue) =>
      issue.relatedEvidence.some((evidenceId) =>
        auditCase.evidence.find((evidence) => evidence.id === evidenceId)?.relatedControls.includes(control.id),
      ),
    );

    return {
      control,
      relatedIssues,
      matchedIssues: relatedIssues.filter((issue) => finalScore.matchedIssueIds.includes(issue.id)),
      missedIssues: relatedIssues.filter((issue) => finalScore.missedIssueIds.includes(issue.id)),
    };
  });
  const coveredControlCount = controlCoverage.filter((entry) => entry.matchedIssues.length > 0).length;
  const partiallyCoveredControlCount = controlCoverage.filter(
    (entry) => entry.matchedIssues.length > 0 && entry.missedIssues.length > 0,
  ).length;
  const canStartAdaptiveDrill =
    missedIssues.length > 0 ||
    unsupportedFindings.length > 0 ||
    thinSupportedFindings.length > 0 ||
    finalScore.severityMismatches.length > 0;

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
          <div className="results-top-actions">
            <button
              type="button"
              className="panel-chip panel-chip-button help-chip"
              onClick={openPauseOverlay}
            >
              Pause: Esc
            </button>
            <button
              type="button"
              className="panel-chip panel-chip-button help-chip"
              onClick={openHelpOverlay}
            >
              Help: H
            </button>
          </div>
        </div>

        <section className="terminal-panel report-summary-panel">
          <div className="report-summary-header">
            <div>
              <p className="eyebrow">Executive Summary</p>
              <h2>{auditCase.title}</h2>
            </div>
            <div className="report-chip">{rank} | {runDifficulty}</div>
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

        <section className="terminal-panel adaptive-drill-panel">
          <div className="artifact-panel-header">
            <div>
              <p className="eyebrow">Adaptive Drill</p>
              <h2>{adaptivePracticeBrief.title}</h2>
            </div>
            <div className="panel-chip">{adaptivePracticeBrief.actionItems.length} steps</div>
          </div>
          <p className="report-summary-copy">{adaptivePracticeBrief.summary}</p>
          <div className="adaptive-drill-grid">
            {adaptivePracticeBrief.actionItems.map((action, index) => (
              <article key={`${action.targetTab}:${index}`} className="study-review-card adaptive-drill-card">
                <div className="mail-header">
                  <strong>{action.title}</strong>
                  <span>{action.targetTab}</span>
                </div>
                <p className="mail-body">{action.detail}</p>
              </article>
            ))}
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

        <section className="terminal-panel study-panel">
          <div className="study-panel-header">
            <div>
              <p className="eyebrow">Study Debrief</p>
              <h2>What This Case Was Teaching</h2>
            </div>
            <div className="report-chip">Next Focus</div>
          </div>
          <p className="report-summary-copy">{nextStepAdvice}</p>

          <div className="study-history-card">
            <div className="study-history-header">
              <div>
                <p className="eyebrow">Case Mastery</p>
                <h3>Career Snapshot</h3>
              </div>
              <div className="report-chip">{projectedRuns} Runs</div>
            </div>
            <div className="study-stat-grid compact">
              <article className="study-stat">
                <span className="metric-label">Projected Best</span>
                <strong>{`${projectedBestScore}/100`}</strong>
              </article>
              <article className="study-stat">
                <span className="metric-label">Current Misses</span>
                <strong>{missedIssues.length}</strong>
              </article>
              <article className="study-stat">
                <span className="metric-label">Evidence Reviewed</span>
                <strong>{reviewedEvidenceIds.length}</strong>
              </article>
              <article className="study-stat">
                <span className="metric-label">Replay Ready</span>
                <strong>{missedIssues.length > 0 ? "Yes" : "No"}</strong>
              </article>
            </div>
          </div>

          <div className="study-grid">
            {controlCoverage.map(({ control, matchedIssues: coveredIssues, missedIssues: uncoveredIssues }) => (
              <article key={control.id} className="study-card">
                <p className="terminal-muted">{control.framework}</p>
                <h3>{control.name}</h3>
                <p>{control.description}</p>
                <p className="study-status">
                  {uncoveredIssues.length > 0
                    ? `Missed ${uncoveredIssues.length} issue${uncoveredIssues.length === 1 ? "" : "s"}`
                    : coveredIssues.length > 0
                      ? "Covered in your report"
                      : "No scored issue tied to this control"}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="terminal-panel progress-summary-panel results-progress-panel">
          <div className="artifact-panel-header">
            <div>
              <p className="eyebrow">Progression Summary</p>
              <h2>Overall Study Momentum</h2>
            </div>
            <div className="panel-chip">
              {studyMomentum.casesTouched}/{studyMomentum.totalCases} Cases Touched
            </div>
          </div>
          <p className="report-summary-copy">
            This run updates your cross-case progress to {studyMomentum.totalRuns} total runs across{" "}
            {studyMomentum.casesTouched} active cases, with {averageBestScoreLabel} average best score and{" "}
            {studyMomentum.replayReadyCases} replay-ready cases.
          </p>
          <div className="progress-summary-grid">
            <article className="progress-summary-card">
              <span className="metric-label">Cases Touched</span>
              <strong>
                {studyMomentum.casesTouched}/{studyMomentum.totalCases}
              </strong>
            </article>
            <article className="progress-summary-card">
              <span className="metric-label">Total Runs</span>
              <strong>{studyMomentum.totalRuns}</strong>
            </article>
            <article className="progress-summary-card">
              <span className="metric-label">Avg Best</span>
              <strong>{averageBestScoreLabel}</strong>
            </article>
            <article className="progress-summary-card">
              <span className="metric-label">Replay Ready</span>
              <strong>{studyMomentum.replayReadyCases}</strong>
            </article>
          </div>
          <p className="scene-copy small progress-summary-footer">
            Strongest case: {strongestCaseLabel}
            {studyMomentum.strongestCase ? ` (${studyMomentum.strongestCase.bestScore}/100)` : ""}. Most replayed:{" "}
            {mostReplayedCaseLabel}
            {studyMomentum.mostReplayedCase ? ` (${studyMomentum.mostReplayedCase.timesPlayed} runs)` : ""}.
          </p>
        </section>
        <CareerProgressPanel
          summary={careerSummary}
          eyebrow="Promotion Review"
          title="Career Advancement"
          contextLabel="Projected After Run"
          className="career-panel-results"
        />

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
                <li>{getSeverityLabel(wellSupportedFindings.length, "evidence-backed finding")}</li>
                <li>{getSeverityLabel(thinSupportedFindings.length, "thinly supported finding")}</li>
                <li>
                  {coveredControlCount}/{auditCase.controls.length} control areas covered
                </li>
                <li>{reviewedEvidenceIds.length} evidence items reviewed</li>
              </ul>
            </div>
          </div>

          <div className="report-sheet-section">
            <h3>Rubric Snapshot</h3>
            <div className="report-rubric-grid">
              <article className="progress-summary-card">
                <span className="metric-label">Evidence-Backed</span>
                <strong>{wellSupportedFindings.length}</strong>
                <p className="terminal-muted">Findings tied directly to the right artifacts.</p>
              </article>
              <article className="progress-summary-card">
                <span className="metric-label">Thin Support</span>
                <strong>{thinSupportedFindings.length}</strong>
                <p className="terminal-muted">Directionally right, but not anchored tightly enough.</p>
              </article>
              <article className="progress-summary-card">
                <span className="metric-label">Control Coverage</span>
                <strong>{coveredControlCount}</strong>
                <p className="terminal-muted">
                  {partiallyCoveredControlCount} areas were only partially covered.
                </p>
              </article>
              <article className="progress-summary-card">
                <span className="metric-label">Unsupported</span>
                <strong>{unsupportedFindings.length}</strong>
                <p className="terminal-muted">Claims that moved ahead of the evidence.</p>
              </article>
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
            <div className="terminal-panel-stack">
              {missedIssues.length > 0 ? (
                missedIssues.map((issue) => (
                  <article key={issue.id} className="study-review-card">
                    <div className="mail-header">
                      <strong>{issue.title}</strong>
                      <span>{issue.severity}</span>
                    </div>
                    <p className="mail-body">{issue.description}</p>
                    <p className="terminal-muted">
                      Recommendation: {issue.recommendation}
                    </p>
                    <p className="terminal-muted">
                      Evidence to notice:{" "}
                      {issue.relatedEvidence
                        .map((evidenceId) => auditCase.evidence.find((entry) => entry.id === evidenceId)?.title ?? evidenceId)
                        .join(", ")}
                    </p>
                    <p className="terminal-muted">
                      Controls touched:{" "}
                      {Array.from(
                        new Set(
                          issue.relatedEvidence.flatMap((evidenceId) =>
                            auditCase.evidence.find((entry) => entry.id === evidenceId)?.relatedControls ?? [],
                          ),
                        ),
                      )
                        .map((controlId) => auditCase.controls.find((entry) => entry.id === controlId)?.name ?? controlId)
                        .join(", ")}
                    </p>
                  </article>
                ))
              ) : (
                <p className="terminal-muted">You captured all expected issues.</p>
              )}
            </div>
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
            <h2>Evidence Quality</h2>
            <div className="terminal-panel-stack">
              {wellSupportedFindings.length > 0 ? (
                <article className="study-review-card">
                  <div className="mail-header">
                    <strong>Evidence-backed findings</strong>
                    <span>{wellSupportedFindings.length}</span>
                  </div>
                  <p className="mail-body">
                    These findings were linked to the right artifacts and read like defensible audit work.
                  </p>
                  <p className="terminal-muted">
                    {wellSupportedFindings
                      .map((finding) => finding.title)
                      .join(", ")}
                  </p>
                </article>
              ) : (
                <p className="terminal-muted">No findings were strongly backed by evidence.</p>
              )}
              {thinSupportedFindings.length > 0 ? (
                <article className="study-review-card">
                  <div className="mail-header">
                    <strong>Thinly supported findings</strong>
                    <span>{thinSupportedFindings.length}</span>
                  </div>
                  <p className="mail-body">
                    The call was directionally right, but the report did not point tightly enough to the supporting artifacts.
                  </p>
                  <p className="terminal-muted">
                    {thinSupportedFindings
                      .map((finding) => finding.title)
                      .join(", ")}
                  </p>
                </article>
              ) : (
                <p className="terminal-muted">No thinly supported findings were flagged.</p>
              )}
            </div>
          </section>

          <section className="terminal-panel">
            <h2>Control Coverage</h2>
            <div className="terminal-panel-stack">
              {controlCoverage.map((entry) => {
                const coverageLabel =
                  entry.matchedIssues.length === 0
                    ? "Not covered"
                    : entry.missedIssues.length > 0
                      ? "Partially covered"
                      : "Covered";

                return (
                  <article key={entry.control.id} className="study-review-card">
                    <div className="mail-header">
                      <strong>{entry.control.name}</strong>
                      <span>{coverageLabel}</span>
                    </div>
                    <p className="mail-body">{entry.control.description}</p>
                    <p className="terminal-muted">
                      {entry.matchedIssues.length} matched issue{entry.matchedIssues.length === 1 ? "" : "s"},
                      {entry.missedIssues.length} missed.
                    </p>
                  </article>
                );
              })}
            </div>
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
              clearPracticeReplay();
              setScene("workstation");
            }}
          >
            <span className="menu-indicator">&lt;</span>
            <span>Back to Workstation</span>
          </button>
          <button
            className="menu-button"
            onClick={() => {
              if (!canStartAdaptiveDrill) {
                return;
              }

              clearPracticeReplay();
              beginPracticeCase(
                auditCase.id,
                finalScore.missedIssueIds,
                runDifficulty,
                adaptivePracticeBrief,
              );
              resetOfficeState();
              setScene("office");
            }}
            disabled={!canStartAdaptiveDrill}
          >
            <span className="menu-indicator">&gt;</span>
            <span>
              Start Adaptive Drill
            </span>
          </button>
          <button
            className="menu-button selected"
            onClick={() => {
              clearPracticeReplay();
              resetAuditProgress();
              resetOfficeState();
              clearSaveData();
              setScene("mainMenu");
            }}
          >
            <span className="menu-indicator">&gt;</span>
            <span>Return to Main Menu</span>
          </button>
        </div>

        {helpOpen && (
          <SceneHelpOverlay
            title="Report Review Guide"
            intro="This screen breaks down what the audit taught you and gives you the quickest path back into the simulator."
            actionLabel="Resume Review"
            footer="Press Esc or use the resume button to close the guide."
            sections={[
              {
                title: "Read The Score",
                items: [
                  "Matched issues show what your report captured successfully.",
                  "Missed issues point to the control gaps and evidence you still need to notice.",
                  "Unsupported findings tell you where the report moved ahead of the evidence.",
                ],
              },
              {
                title: "Next Actions",
                items: [
                  "Print the report if you want a formal closeout artifact.",
                  "Return to the workstation to revisit the case manually.",
                  "Use Practice Missed Issues to replay the gaps from this run.",
                ],
              },
              {
                title: "Study Tip",
                items: [
                  "Focus on the evidence trail behind each missed issue before starting the next case.",
                  "The control summary on this screen is meant to guide your next replay.",
                ],
              },
            ]}
            onClose={closeHelpOverlay}
          />
        )}

        {pauseOpen && (
          <ScenePauseOverlay
            title="Report Review Paused"
            intro="Pause the debrief, adjust your session settings, and jump back into the study review exactly where you left it."
            resumeLabel="Resume Review"
            secondaryActionLabel="Return to Main Menu"
            secondaryActionHint="This exits the review shell and returns you to the main menu without clearing your current study progress."
            onResume={closePauseOverlay}
            onSecondaryAction={() => {
              closePauseOverlay();
              setScene("mainMenu");
            }}
          />
        )}
      </div>
    </section>
  );
}
