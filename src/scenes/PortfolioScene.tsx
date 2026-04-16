import { useEffect, useMemo } from "react";
import { CareerProgressPanel } from "../components/CareerProgressPanel";
import { playBackTone, playConfirmTone, playNavigateTone } from "../utils/audio";
import { buildCaseCatalog } from "../utils/caseCatalog";
import { runDifficultyOptions } from "../utils/runDifficulty";
import { useAuditStore } from "../store/useAuditStore";
import { useGameStore } from "../store/useGameStore";
import { getCareerProgressSummary, getCaseMasteryStats, getRecentStudyRuns, getStudyMomentumSummary, queuePracticeReplay } from "../utils/studyProgress";

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Timestamp unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatScore(score: number | null) {
  return score === null ? "—" : `${score}/100`;
}

function getLatestRunDifficultyLabel(runDifficulty: string | undefined) {
  return runDifficultyOptions.find((option) => option.id === runDifficulty)?.label ?? "Normal";
}

function formatIssueTrail(labels: string[], totalCount: number) {
  if (totalCount === 0) {
    return "No miss trail yet";
  }

  const preview = labels.slice(0, 3);
  const remainingCount = Math.max(0, totalCount - preview.length);

  if (preview.length === 0) {
    return `${totalCount} issue${totalCount === 1 ? "" : "s"} recorded`;
  }

  return remainingCount > 0 ? `${preview.join(", ")} +${remainingCount} more` : preview.join(", ");
}

export function PortfolioScene() {
  const setScene = useGameStore((state) => state.setScene);
  const sfxVolume = useGameStore((state) => state.settings.sfxVolume);
  const availableCases = useAuditStore((state) => state.availableCases);
  const selectedCaseId = useAuditStore((state) => state.selectedCaseId);
  const setSelectedCase = useAuditStore((state) => state.setSelectedCase);
  const beginPracticeCase = useAuditStore((state) => state.beginPracticeCase);

  const caseCatalog = useMemo(() => buildCaseCatalog(availableCases), [availableCases]);
  const careerSummary = useMemo(() => getCareerProgressSummary(caseCatalog), [caseCatalog]);
  const studyMomentum = useMemo(
    () => getStudyMomentumSummary(availableCases.map((auditCase) => auditCase.id)),
    [availableCases],
  );
  const recentRuns = useMemo(() => getRecentStudyRuns(caseCatalog, 8), [caseCatalog]);
  const recentRunByCase = useMemo(
    () =>
      recentRuns.reduce<Map<string, (typeof recentRuns)[number]>>((map, run) => {
        if (!map.has(run.caseId)) {
          map.set(run.caseId, run);
        }

        return map;
      }, new Map()),
    [recentRuns],
  );
  const selectedCaseIndex = useMemo(
    () => caseCatalog.findIndex((auditCase) => auditCase.id === selectedCaseId),
    [caseCatalog, selectedCaseId],
  );
  const selectedCase = caseCatalog[selectedCaseIndex] ?? caseCatalog[0];
  const selectedCaseStudy = useMemo(() => getCaseMasteryStats(selectedCase.id), [selectedCase.id]);
  const selectedCaseLatestRun = recentRunByCase.get(selectedCase.id) ?? null;
  const selectedCaseRuns = recentRuns.filter((run) => run.caseId === selectedCase.id);
  const selectedCaseFocusLabels = useMemo(
    () =>
      selectedCaseStudy.lastMissedIssueIds
        .map((issueId) => selectedCase.issues.find((issue) => issue.id === issueId)?.title ?? issueId)
        .filter(Boolean),
    [selectedCase, selectedCaseStudy.lastMissedIssueIds],
  );
  const selectedCaseMissedIssueCount = selectedCaseStudy.lastMissedIssueIds.length;
  const selectedCaseReplayReady = selectedCaseMissedIssueCount > 0;
  const selectedCaseIssueTrail = formatIssueTrail(selectedCaseFocusLabels, selectedCaseMissedIssueCount);
  const strongestCaseLabel = useMemo(() => {
    const strongestCase = studyMomentum.strongestCase;
    if (!strongestCase) {
      return "No scored case yet";
    }

    return (
      availableCases.find((auditCase) => auditCase.id === strongestCase.caseId)?.title ?? strongestCase.caseId
    );
  }, [availableCases, studyMomentum.strongestCase]);
  const mostReplayedCaseLabel = useMemo(() => {
    const mostReplayedCase = studyMomentum.mostReplayedCase;
    if (!mostReplayedCase) {
      return "No replay loop yet";
    }

    return (
      availableCases.find((auditCase) => auditCase.id === mostReplayedCase.caseId)?.title ?? mostReplayedCase.caseId
    );
  }, [availableCases, studyMomentum.mostReplayedCase]);
  const averageBestScoreLabel =
    studyMomentum.averageBestScore === null ? "—" : `${studyMomentum.averageBestScore}/100`;

  const cycleCase = (direction: -1 | 1) => {
    if (caseCatalog.length === 0) {
      return;
    }

    const nextIndex = (selectedCaseIndex + direction + caseCatalog.length) % caseCatalog.length;
    setSelectedCase(caseCatalog[nextIndex].id);
  };

  const openCaseInMenu = (caseId: string) => {
    playConfirmTone(sfxVolume);
    setSelectedCase(caseId);
    setScene("mainMenu");
  };

  const startPracticeReplay = (caseId: string) => {
    const caseStats = getCaseMasteryStats(caseId);
    const focusIssueIds = caseStats.lastMissedIssueIds;
    if (focusIssueIds.length === 0) {
      return;
    }

    const practiceDifficulty = recentRunByCase.get(caseId)?.runDifficulty ?? "normal";
    playConfirmTone(sfxVolume);
    queuePracticeReplay(caseId, focusIssueIds, practiceDifficulty);
    setSelectedCase(caseId);
    setScene("mainMenu");
  };

  useEffect(() => {
    if (caseCatalog.length === 0) {
      return;
    }

    if (!caseCatalog.some((auditCase) => auditCase.id === selectedCaseId)) {
      setSelectedCase(caseCatalog[0].id);
    }
  }, [caseCatalog, selectedCaseId, setSelectedCase]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        playBackTone(sfxVolume);
        setScene("mainMenu");
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        playNavigateTone(sfxVolume);
        cycleCase(-1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        playNavigateTone(sfxVolume);
        cycleCase(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cycleCase, sfxVolume, setScene]);

  const activeCoverage = careerSummary.categoryCoverage.filter((entry) => entry.touchedCases > 0).length;
  const selectedRunDifficultyLabel = getLatestRunDifficultyLabel(selectedCaseLatestRun?.runDifficulty);

  return (
    <section className="scene scene-portfolio">
      <div className="scene-card wide portfolio-card">
        <div className="portfolio-hero">
          <div>
            <p className="eyebrow">Portfolio Archive</p>
            <h1>DOCKET ROOM</h1>
            <p className="scene-copy report-lead">
              Review prior runs, coverage gaps, and promotion progress before opening the next engagement.
            </p>
          </div>
          <div className="portfolio-hero-actions">
            <div className="panel-chip">
              {careerSummary.careerTitle} - Level {careerSummary.careerLevel}
            </div>
            <div className="panel-chip">
              {studyMomentum.casesTouched}/{studyMomentum.totalCases} Cases Touched
            </div>
            <div className="panel-chip">{studyMomentum.totalRuns} Total Runs</div>
          </div>
        </div>

        <div className="portfolio-layout">
          <div className="portfolio-column">
            <CareerProgressPanel
              summary={careerSummary}
              eyebrow="Portfolio Snapshot"
              title="Career Advancement"
              contextLabel="Archive View"
              className="career-panel-portfolio"
            />

            <section className="terminal-panel portfolio-summary-panel" aria-label="Study momentum">
              <div className="artifact-panel-header">
                <div>
                  <p className="eyebrow">Study Momentum</p>
                  <h2>Review Pulse</h2>
                </div>
                <div className="panel-chip">{studyMomentum.replayReadyCases} Replay Ready</div>
              </div>
              <p className="scene-copy small">
                {studyMomentum.totalRuns} total runs, {averageBestScoreLabel} average best score, and a
                {studyMomentum.casesTouched > 0 ? " visible" : " growing"} archive trail across {activeCoverage} covered
                families. Replay-ready cases are the ones with a stored miss trail.
              </p>
              <div className="portfolio-preview-grid">
                <article className="portfolio-preview-card">
                  <span className="metric-label">Strongest Case</span>
                  <strong>{strongestCaseLabel}</strong>
                </article>
                <article className="portfolio-preview-card">
                  <span className="metric-label">Most Replayed</span>
                  <strong>{mostReplayedCaseLabel}</strong>
                </article>
                <article className="portfolio-preview-card">
                  <span className="metric-label">Replay Ready</span>
                  <strong>{studyMomentum.replayReadyCases}</strong>
                </article>
                <article className="portfolio-preview-card">
                  <span className="metric-label">Coverage Families</span>
                  <strong>{activeCoverage}/{careerSummary.categoryCoverage.length}</strong>
                </article>
              </div>
              <button type="button" className="menu-button selected" onClick={() => setScene("mainMenu")}>
                <span className="menu-indicator">&lt;</span>
                <span>Back to Menu</span>
              </button>
            </section>
          </div>

          <div className="portfolio-column">
            <section className="terminal-panel portfolio-spotlight-panel" aria-label="Selected case dossier">
              <div className="artifact-panel-header">
                <div>
                  <p className="eyebrow">Selected Dossier</p>
                  <h2>{selectedCase.title}</h2>
                </div>
                <div className="portfolio-spotlight-nav">
                  <button
                    type="button"
                    className="case-switch-button"
                    onClick={() => {
                      playNavigateTone(sfxVolume);
                      cycleCase(-1);
                    }}
                    aria-label="Previous case"
                  >
                    &lt;
                  </button>
                  <button
                    type="button"
                    className="case-switch-button"
                    onClick={() => {
                      playNavigateTone(sfxVolume);
                      cycleCase(1);
                    }}
                    aria-label="Next case"
                  >
                    &gt;
                  </button>
                </div>
              </div>
              <div className="portfolio-spotlight-meta">
                <span className="panel-chip">{selectedCase.familyLabel}</span>
                <span className="panel-chip">{selectedCase.difficultyLabel}</span>
                <span className="panel-chip">{selectedRunDifficultyLabel} last run</span>
                <span className="panel-chip">{selectedCase.deadlineDays} day sprint</span>
              </div>
              <p className="scene-copy small">{selectedCase.summary}</p>
              <p className="scene-copy small">
                {selectedCase.objective}
              </p>
              <div className="portfolio-spotlight-stats">
                <article className="portfolio-spotlight-stat">
                  <span className="metric-label">Runs</span>
                  <strong>{selectedCaseStudy.timesPlayed}</strong>
                </article>
                <article className="portfolio-spotlight-stat">
                  <span className="metric-label">Best Score</span>
                  <strong>{formatScore(selectedCaseStudy.bestScore)}</strong>
                </article>
                <article className="portfolio-spotlight-stat">
                  <span className="metric-label">Last Played</span>
                  <strong>{selectedCaseStudy.lastPlayedAt ? formatTimestamp(selectedCaseStudy.lastPlayedAt) : "Never"}</strong>
                </article>
                <article className="portfolio-spotlight-stat">
                  <span className="metric-label">Missed Issues</span>
                  <strong>{selectedCaseMissedIssueCount}</strong>
                </article>
              </div>
              <div className="portfolio-focus-block">
                <div className="artifact-panel-header">
                  <div>
                    <p className="eyebrow">Targeted Replay</p>
                    <h3>{selectedCaseReplayReady ? "Replay the miss trail" : "Replay locked until a miss trail exists"}</h3>
                  </div>
                  <div className="panel-chip">{selectedCaseReplayReady ? "Replay Ready" : "Locked"}</div>
                </div>
                <p className="scene-copy small">
                  {selectedCaseReplayReady
                    ? `This case is replay-ready because the last recorded run missed ${selectedCaseMissedIssueCount} issue${selectedCaseMissedIssueCount === 1 ? "" : "s"}.`
                    : "Targeted replay unlocks after a run records misses. Finish one pass, and the archive will point you back to the exact gaps."}
                </p>
                {selectedCaseReplayReady ? (
                  <p className="scene-copy small portfolio-focus-copy">
                    Miss trail: {selectedCaseIssueTrail}
                  </p>
                ) : (
                  <p className="scene-copy small portfolio-focus-copy">
                    No miss trail yet. Run this case once, then the archive will surface a focused retry here.
                  </p>
                )}
              </div>
              {selectedCaseRuns.length > 0 ? (
                <div className="portfolio-mini-run-list" aria-label="Selected case run tape">
                  {selectedCaseRuns.slice(0, 3).map((run) => (
                    <article key={`${run.caseId}:${run.playedAt}`} className="portfolio-mini-run-card">
                      <div className="portfolio-mini-run-head">
                        <strong>{run.score}/100</strong>
                        <span>{formatTimestamp(run.playedAt)}</span>
                      </div>
                      <div className="portfolio-mini-run-meta">
                        <span>{run.runDifficulty}</span>
                        <span>{run.missedIssueIds.length} missed</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
              <div className="portfolio-spotlight-actions">
                <button type="button" className="menu-button" onClick={() => openCaseInMenu(selectedCase.id)}>
                  <span className="menu-indicator">&gt;</span>
                  <span>Open in Menu</span>
                </button>
                <button
                  type="button"
                  className="menu-button selected"
                  onClick={() => startPracticeReplay(selectedCase.id)}
                  disabled={!selectedCaseReplayReady}
                >
                  <span className="menu-indicator">&gt;</span>
                  <span>{selectedCaseReplayReady ? "Launch Focused Replay" : "Replay Locked"}</span>
                </button>
              </div>
            </section>

            <section className="terminal-panel portfolio-tape-panel" aria-label="Recent review tape">
              <div className="artifact-panel-header">
                <div>
                  <p className="eyebrow">Recent Review Tape</p>
                  <h2>Latest Runs</h2>
                </div>
                <div className="panel-chip">{recentRuns.length} runs shown</div>
              </div>
              {recentRuns.length > 0 ? (
                <div className="portfolio-run-list">
                  {recentRuns.map((run) => (
                    <article key={`${run.caseId}:${run.playedAt}`} className="portfolio-run-card">
                      <div className="portfolio-run-head">
                        <div>
                          <p className="portfolio-run-family">{run.familyLabel}</p>
                          <h3>{run.caseTitle}</h3>
                        </div>
                        <div className="portfolio-run-score">{run.score}/100</div>
                      </div>
                      <div className="portfolio-run-meta">
                        <span>{formatTimestamp(run.playedAt)}</span>
                        <span>{run.runDifficulty} run</span>
                        <span>{run.missedIssueIds.length} missed</span>
                      </div>
                      <p className="scene-copy small portfolio-run-note">
                        {run.unsupportedCount > 0
                          ? `${run.unsupportedCount} unsupported finding${run.unsupportedCount === 1 ? "" : "s"} flagged.`
                          : run.thinSupportedCount > 0
                            ? `${run.thinSupportedCount} finding${run.thinSupportedCount === 1 ? "" : "s"} needed stronger evidence support.`
                            : run.missedIssueIds.length > 0
                              ? `Control coverage slipped on ${run.missedIssueIds.length} issue${run.missedIssueIds.length === 1 ? "" : "s"}.`
                              : "Clean closeout with no missed issues recorded."}
                        {" "}
                        {run.totalControls > 0
                          ? `Covered ${run.coveredControlCount}/${run.totalControls} control areas.`
                          : ""}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="scene-copy small">
                  No archived runs yet. Finish a case and the tape will start filling in here.
                </p>
              )}
            </section>
          </div>
        </div>

        <section className="terminal-panel portfolio-ledger-panel" aria-label="Case ledger">
          <div className="artifact-panel-header">
            <div>
              <p className="eyebrow">Case Ledger</p>
              <h2>All Engagements</h2>
            </div>
            <div className="panel-chip">{caseCatalog.length} cases archived</div>
          </div>
          <div className="portfolio-ledger-grid">
            {caseCatalog.map((auditCase) => {
              const caseStudy = getCaseMasteryStats(auditCase.id);
              const latestRun = recentRunByCase.get(auditCase.id) ?? null;
              const caseReplayReady = caseStudy.lastMissedIssueIds.length > 0;
              const caseMissLabels = caseStudy.lastMissedIssueIds
                .map((issueId) => auditCase.issues.find((issue) => issue.id === issueId)?.title ?? issueId)
                .filter(Boolean)
                .slice(0, 2);

              return (
                <article key={auditCase.id} className="portfolio-ledger-card">
                  <div className="portfolio-ledger-head">
                    <div>
                      <p className="portfolio-run-family">{auditCase.familyLabel}</p>
                      <h3>{auditCase.title}</h3>
                    </div>
                    <div className="portfolio-run-score">{formatScore(caseStudy.bestScore)}</div>
                  </div>
                  <div className="portfolio-ledger-meta">
                    <span className="panel-chip">{auditCase.difficultyLabel}</span>
                    <span className="panel-chip">{caseStudy.timesPlayed} runs</span>
                    <span className="panel-chip">
                      {latestRun ? getLatestRunDifficultyLabel(latestRun.runDifficulty) : "No run yet"}
                    </span>
                  </div>
                  <p className="scene-copy small">
                    {auditCase.summary}
                  </p>
                  <div className="portfolio-ledger-stats">
                    <span>Last played: {caseStudy.lastPlayedAt ? formatTimestamp(caseStudy.lastPlayedAt) : "Never"}</span>
                    <span>Missed: {caseStudy.lastMissedIssueIds.length}</span>
                  </div>
                  {caseReplayReady ? (
                    <p className="scene-copy small portfolio-ledger-focus">
                      Replay ready. Miss trail: {formatIssueTrail(caseMissLabels, caseStudy.lastMissedIssueIds.length)}
                    </p>
                  ) : (
                    <p className="scene-copy small portfolio-ledger-focus">
                      Replay locked. Run this case once to seed a miss trail and unlock a focused retry.
                    </p>
                  )}
                  <div className="portfolio-ledger-actions">
                    <button type="button" className="menu-button" onClick={() => openCaseInMenu(auditCase.id)}>
                      <span className="menu-indicator">&gt;</span>
                      <span>Open in Menu</span>
                    </button>
                    <button
                      type="button"
                      className="menu-button selected"
                      onClick={() => startPracticeReplay(auditCase.id)}
                      disabled={!caseReplayReady}
                    >
                      <span className="menu-indicator">&gt;</span>
                      <span>{caseReplayReady ? "Launch Focused Replay" : "Replay Locked"}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
