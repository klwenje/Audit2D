import { useEffect, useMemo, useState } from "react";
import {
  buildCaseCatalog,
  caseFamilyOptions,
  caseSortOptions,
  filterCaseCatalog,
  sortCaseCatalog,
  type CaseFamilyFilter,
  type CaseSortMode,
} from "../utils/caseCatalog";
import { runDifficultyOptions, type RunDifficulty } from "../utils/runDifficulty";
import { useAuditStore } from "../store/useAuditStore";
import { useGameStore } from "../store/useGameStore";
import { playConfirmTone, playNavigateTone } from "../utils/audio";
import { loadSaveData } from "../utils/saveData";
import { getCampaignRecommendation } from "../utils/campaignPlanner";
import { getCampaignProgress } from "../utils/campaignProgress";
import {
  clearPracticeReplay,
  consumePracticeReplay,
  getCareerProgressSummary,
  getCaseMasteryStats,
  getStudyMomentumSummary,
  loadPracticeReplay,
  queuePracticeReplay,
} from "../utils/studyProgress";
import { SceneModal } from "../components/SceneModal";

const menuItems = ["New Game", "Continue", "Portfolio", "Options", "Credits"] as const;

type MenuAlertState =
  | {
      title: string;
      body: string;
      actionLabel: string;
    }
  | null;

function formatSavedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Save timestamp unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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

export function MainMenuScene() {
  const setScene = useGameStore((state) => state.setScene);
  const resetOfficeState = useGameStore((state) => state.resetOfficeState);
  const sfxVolume = useGameStore((state) => state.settings.sfxVolume);
  const availableCases = useAuditStore((state) => state.availableCases);
  const selectedCaseId = useAuditStore((state) => state.selectedCaseId);
  const setSelectedCase = useAuditStore((state) => state.setSelectedCase);
  const beginCase = useAuditStore((state) => state.beginCase);
  const beginPracticeCase = useAuditStore((state) => state.beginPracticeCase);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [familyFilter, setFamilyFilter] = useState<CaseFamilyFilter>("all");
  const [caseSortMode, setCaseSortMode] = useState<CaseSortMode>("recommended");
  const [selectedRunDifficulty, setSelectedRunDifficulty] = useState<RunDifficulty>("normal");
  const [practiceReplaySession, setPracticeReplaySession] = useState(() => loadPracticeReplay());
  const [menuAlert, setMenuAlert] = useState<MenuAlertState>(null);
  const saveData = loadSaveData();
  const continueScene = saveData?.scene && saveData.scene !== "splash" ? saveData.scene : "office";
  const hasSaveData = Boolean(saveData);
  const lastSavedLabel = saveData ? formatSavedAt(saveData.savedAt) : "No active save on disk";

  const selectedLabel = useMemo(() => menuItems[selectedIndex], [selectedIndex]);
  const caseCatalog = useMemo(() => buildCaseCatalog(availableCases), [availableCases]);
  const careerSummary = useMemo(() => getCareerProgressSummary(caseCatalog), [caseCatalog]);
  const campaignProgress = useMemo(
    () => getCampaignProgress(caseCatalog, careerSummary),
    [caseCatalog, careerSummary],
  );
  const playableCaseIds = useMemo(
    () => new Set(campaignProgress.unlockedCaseIds),
    [campaignProgress.unlockedCaseIds],
  );
  const filteredCases = useMemo(
    () => sortCaseCatalog(filterCaseCatalog(caseCatalog, familyFilter), caseSortMode),
    [caseCatalog, familyFilter, caseSortMode],
  );
  const unlockedFilteredCases = useMemo(
    () => filteredCases.filter((auditCase) => playableCaseIds.has(auditCase.id)),
    [filteredCases, playableCaseIds],
  );
  const selectedCaseIndex = useMemo(
    () => unlockedFilteredCases.findIndex((auditCase) => auditCase.id === selectedCaseId),
    [unlockedFilteredCases, selectedCaseId],
  );
  const selectedCase = unlockedFilteredCases[selectedCaseIndex] ?? unlockedFilteredCases[0] ?? caseCatalog[0];
  const studyMomentum = useMemo(
    () => getStudyMomentumSummary(availableCases.map((auditCase) => auditCase.id)),
    [availableCases],
  );
  const selectedCaseStudy = useMemo(() => getCaseMasteryStats(selectedCase.id), [selectedCase.id]);
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
  const selectedCaseFinalGapReady = selectedCaseMissedIssueCount === 1;
  const selectedCaseNarrowReplay = selectedCaseMissedIssueCount > 0 && selectedCaseMissedIssueCount <= 2;
  const selectedCaseReplayBadge = selectedCaseReplayReady
    ? selectedCaseFinalGapReady
      ? "Final Gap Ready"
      : selectedCaseNarrowReplay
        ? "Cleanup Ready"
        : "Replay Ready"
    : "Locked";
  const selectedCaseReplayHeading = selectedCaseReplayReady
    ? selectedCaseFinalGapReady
      ? "Finish the final gap"
      : selectedCaseNarrowReplay
        ? "Finish the remaining gaps"
        : "Replay the miss trail"
    : "Replay locked until a miss trail exists";
  const selectedCaseReplaySummary = selectedCaseReplayReady
    ? selectedCaseFinalGapReady
      ? `This case is down to one active miss: ${selectedCaseFocusLabels[0] ?? "the remaining control gap"}.`
      : selectedCaseNarrowReplay
        ? `This case is down to ${selectedCaseMissedIssueCount} active misses and is ready for a cleanup replay.`
        : `This case is replay-ready because the last recorded run missed ${selectedCaseMissedIssueCount} issue${selectedCaseMissedIssueCount === 1 ? "" : "s"}.`
    : "Targeted replay unlocks after a run records misses. Finish one pass, and this panel will point you back to the exact gaps.";
  const selectedCaseReplayNote = selectedCaseReplayReady
    ? selectedCaseFinalGapReady
      ? "The next replay should act like a finishing pass: reopen the case at the selected difficulty and close the last remaining gap cleanly."
      : selectedCaseNarrowReplay
        ? "The next replay will reopen this case at the selected difficulty and keep the remaining gaps front and center."
        : "The next replay will reopen this case at the selected difficulty and keep the miss trail front and center."
    : "Use the first run to seed the archive, then come back here to launch a focused retry.";
  const selectedCaseReplayActionLabel = selectedCaseReplayReady
    ? selectedCaseFinalGapReady
      ? "Finish Final Gap"
      : selectedCaseNarrowReplay
        ? "Finish Remaining Gaps"
        : "Launch Focused Replay"
    : "Replay Locked";
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
  const familyCountLabel =
    familyFilter === "all"
      ? "All families"
      : caseFamilyOptions.find((option) => option.id === familyFilter)?.label ?? "Filtered";
  const sortCountLabel = caseSortOptions.find((option) => option.id === caseSortMode)?.label ?? "Recommended";
  const selectedRunDifficultyOption =
    runDifficultyOptions.find((option) => option.id === selectedRunDifficulty) ?? runDifficultyOptions[1];
  const campaignRecommendation = useMemo(
    () => getCampaignRecommendation(caseCatalog, careerSummary),
    [caseCatalog, careerSummary],
  );

  const startNewGame = () => {
    setMenuAlert(null);
    clearPracticeReplay();
    setPracticeReplaySession(null);
    beginCase(selectedCase.id, selectedRunDifficulty);
    resetOfficeState();
    setScene("office");
  };

  const openPortfolio = () => {
    setMenuAlert(null);
    setScene("portfolio");
  };

  const startPracticeReplay = () => {
    if (selectedCaseStudy.lastMissedIssueIds.length === 0) {
      return;
    }

    queuePracticeReplay(selectedCase.id, selectedCaseStudy.lastMissedIssueIds, selectedRunDifficulty);
    setPracticeReplaySession(loadPracticeReplay());
  };

  const launchCampaignRecommendation = () => {
    if (!campaignRecommendation) {
      return;
    }

    setSelectedCase(campaignRecommendation.caseId);

    if (campaignRecommendation.mode === "practice") {
      queuePracticeReplay(
        campaignRecommendation.caseId,
        campaignRecommendation.focusIssueIds,
        campaignRecommendation.runDifficulty,
      );
      setPracticeReplaySession(loadPracticeReplay());
      return;
    }

    clearPracticeReplay();
    setPracticeReplaySession(null);
    beginCase(campaignRecommendation.caseId, campaignRecommendation.runDifficulty);
    resetOfficeState();
    setScene("office");
  };

  const openCredits = () => {
    setMenuAlert({
      title: "Audit Desk Retro",
      body: "Designed as a lightweight indie-style audit simulator for training judgment, evidence review, and control testing.",
      actionLabel: "Close File",
    });
  };

  const openNoSaveNotice = () => {
    setMenuAlert({
      title: "No Save Data Found",
      body: "Start a run first, then Continue will resume the last active audit session from disk.",
      actionLabel: "Understood",
    });
  };

  const closeMenuAlert = () => {
    setMenuAlert(null);
  };

  const cycleCase = (direction: -1 | 1) => {
    if (unlockedFilteredCases.length === 0) {
      return;
    }

    const nextIndex =
      (selectedCaseIndex + direction + unlockedFilteredCases.length) % unlockedFilteredCases.length;
    setSelectedCase(unlockedFilteredCases[nextIndex].id);
  };

  useEffect(() => {
    if (unlockedFilteredCases.length === 0) {
      return;
    }

    if (!unlockedFilteredCases.some((auditCase) => auditCase.id === selectedCaseId)) {
      setSelectedCase(unlockedFilteredCases[0].id);
    }
  }, [selectedCaseId, setSelectedCase, unlockedFilteredCases]);

  useEffect(() => {
    if (!practiceReplaySession) {
      return;
    }

    const timer = window.setTimeout(() => {
      const session = consumePracticeReplay();
      if (!session) {
        setPracticeReplaySession(null);
        return;
      }

      beginPracticeCase(session.caseId, session.focusIssueIds, session.runDifficulty);
      resetOfficeState();
      setPracticeReplaySession(null);
      setScene("office");
    }, 500);

    return () => window.clearTimeout(timer);
  }, [beginPracticeCase, practiceReplaySession, resetOfficeState, setScene]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (menuAlert) {
        if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          closeMenuAlert();
        }

        return;
      }

      if (event.key === "ArrowUp") {
        playNavigateTone(sfxVolume);
        setSelectedIndex((current) => (current - 1 + menuItems.length) % menuItems.length);
      }

      if (event.key === "ArrowDown") {
        playNavigateTone(sfxVolume);
        setSelectedIndex((current) => (current + 1) % menuItems.length);
      }

      if (event.key === "Enter") {
        playConfirmTone(sfxVolume);
        if (selectedLabel === "Options") {
          setScene("options");
        } else if (selectedLabel === "New Game") {
          startNewGame();
        } else if (selectedLabel === "Portfolio") {
          openPortfolio();
        } else if (selectedLabel === "Continue" && hasSaveData) {
          setScene(continueScene);
        } else if (selectedLabel === "Credits") {
          openCredits();
        } else {
          openNoSaveNotice();
        }
      }

      if (event.key === "ArrowLeft") {
        playNavigateTone(sfxVolume);
        cycleCase(-1);
      }

      if (event.key === "ArrowRight") {
        playNavigateTone(sfxVolume);
        cycleCase(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [continueScene, cycleCase, hasSaveData, menuAlert, selectedLabel, setScene, sfxVolume, startNewGame]);

  return (
    <section className="scene scene-menu">
      <div className="scene-card menu-card">
        <p className="eyebrow">Case File Zero</p>
        <h1>MAIN MENU</h1>
        <section className="progress-summary-panel" aria-label="Study momentum summary">
          <div className="artifact-panel-header">
            <div>
              <p className="eyebrow">Progression Summary</p>
              <h2>Study Momentum</h2>
            </div>
            <div className="panel-chip">
              {studyMomentum.casesTouched}/{studyMomentum.totalCases} Cases Touched
            </div>
          </div>
          <p className="scene-copy small">
            {studyMomentum.totalRuns} total runs, {averageBestScoreLabel} average best score, and{" "}
            {studyMomentum.replayReadyCases} cases with a live miss trail for focused replay.
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
        <section className="terminal-panel portfolio-preview-panel" aria-label="Portfolio archive preview">
          <div className="artifact-panel-header">
            <div>
              <p className="eyebrow">Portfolio Archive</p>
              <h2>Open Dossier</h2>
            </div>
            <div className="panel-chip">{careerSummary.careerTitle}</div>
          </div>
          <p className="scene-copy small">
            Step into the dedicated archive to review prior runs, promotion progress, and case coverage by family.
          </p>
          <div className="portfolio-preview-grid">
            <article className="portfolio-preview-card">
              <span className="metric-label">Career Level</span>
              <strong>
                Level {careerSummary.careerLevel} - {careerSummary.careerTitle}
              </strong>
            </article>
            <article className="portfolio-preview-card">
              <span className="metric-label">Average Best</span>
              <strong>{averageBestScoreLabel}</strong>
            </article>
            <article className="portfolio-preview-card">
              <span className="metric-label">Replay Ready</span>
              <strong>{studyMomentum.replayReadyCases}</strong>
            </article>
            <article className="portfolio-preview-card">
              <span className="metric-label">Coverage Families</span>
              <strong>
                {careerSummary.categoryCoverage.filter((entry) => entry.touchedCases > 0).length}/
                {careerSummary.categoryCoverage.length}
              </strong>
            </article>
          </div>
          <button
            type="button"
            className="menu-button selected"
            onClick={() => {
              playConfirmTone(sfxVolume);
              openPortfolio();
            }}
          >
            <span className="menu-indicator">&gt;</span>
            <span>Open Portfolio</span>
          </button>
        </section>
        {campaignRecommendation ? (
          <section className="terminal-panel campaign-panel" aria-label="Adaptive campaign plan">
            <div className="artifact-panel-header">
              <div>
                <p className="eyebrow">Adaptive Campaign</p>
                <h2>{campaignRecommendation.title}</h2>
              </div>
              <div className="panel-chip">
                {campaignRecommendation.mode === "practice" ? "Replay Route" : "Growth Route"}
              </div>
            </div>
            <p className="scene-copy small">{campaignRecommendation.summary}</p>
            <p className="scene-copy small campaign-rationale">{campaignRecommendation.rationale}</p>
            <div className="case-meta-strip">
              <span className="panel-chip">
                {caseCatalog.find((entry) => entry.id === campaignRecommendation.caseId)?.familyLabel ?? "Case"}
              </span>
              <span className="panel-chip">
                {runDifficultyOptions.find((option) => option.id === campaignRecommendation.runDifficulty)?.label ?? "Normal"}
              </span>
              <span className="panel-chip">
                {campaignRecommendation.mode === "practice"
                  ? `${campaignRecommendation.focusIssueIds.length} focus issue${campaignRecommendation.focusIssueIds.length === 1 ? "" : "s"}`
                  : "Standard run"}
              </span>
            </div>
            <button
              type="button"
              className="menu-button selected"
              onClick={() => {
                playConfirmTone(sfxVolume);
                launchCampaignRecommendation();
              }}
            >
              <span className="menu-indicator">&gt;</span>
              <span>{campaignRecommendation.actionLabel}</span>
            </button>
          </section>
        ) : null}
        <section className="terminal-panel campaign-arc-panel" aria-label="Campaign arcs">
          <div className="artifact-panel-header">
            <div>
              <p className="eyebrow">Campaign Map</p>
              <h2>Arc Unlocks</h2>
            </div>
            <div className="panel-chip">
              {campaignProgress.arcs.filter((arc) => arc.unlocked).length}/{campaignProgress.arcs.length} Open
            </div>
          </div>
          <div className="campaign-arc-grid">
            {campaignProgress.arcs.map((arc) => (
              <article key={arc.id} className={`campaign-arc-card ${arc.unlocked ? "open" : "locked"}`}>
                <div className="campaign-arc-head">
                  <div>
                    <span className="metric-label">{arc.unlocked ? "Open Arc" : "Locked Arc"}</span>
                    <strong>{arc.title}</strong>
                  </div>
                  <span className="panel-chip">{arc.playedCount}/{arc.caseIds.length} played</span>
                </div>
                <p className="scene-copy small">{arc.summary}</p>
                <p className="scene-copy small campaign-arc-progress">
                  {arc.clearedCount} cleared at 65+, {arc.masteredCount} mastered, {arc.averageBestScore === null ? "—" : `${arc.averageBestScore}/100`} average best.
                </p>
                {!arc.unlocked && arc.unmetRequirements.length > 0 ? (
                  <div className="campaign-arc-locklist">
                    {arc.unmetRequirements.map((requirement) => (
                      <p key={requirement} className="scene-copy small">{requirement}</p>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
        <section className="terminal-panel promotion-review-panel" aria-label="Promotion review">
          <div className="artifact-panel-header">
            <div>
              <p className="eyebrow">Promotion Review</p>
              <h2>{campaignProgress.promotionReview.title}</h2>
            </div>
            <div className="panel-chip">
              {campaignProgress.promotionReview.items.filter((item) => item.complete).length}/{campaignProgress.promotionReview.items.length} Complete
            </div>
          </div>
          <p className="scene-copy small">{campaignProgress.promotionReview.summary}</p>
          <div className="promotion-review-list">
            {campaignProgress.promotionReview.items.map((item) => (
              <article key={item.label} className={`promotion-review-card ${item.complete ? "complete" : ""}`}>
                <span className="metric-label">{item.complete ? "Complete" : "In Progress"}</span>
                <strong>{item.label}</strong>
                <p>{item.progressLabel}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="case-select-card" aria-label="Case selection">
          <div className="case-select-header">
            <p className="eyebrow">Selected Engagement</p>
            <div className="case-select-controls">
              <div className="panel-chip case-count-chip">
                {unlockedFilteredCases.length}/{availableCases.length} unlocked
              </div>
              <button
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
          <div className="catalog-controls" aria-label="Case library filters and sort order">
            <div className="catalog-control-group">
              <p className="metric-label">Family Filter</p>
              <div className="catalog-chip-row" role="toolbar" aria-label="Case family filters">
                {caseFamilyOptions.map((option) => {
                  const isSelected = familyFilter === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`catalog-chip ${isSelected ? "selected" : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => {
                        playNavigateTone(sfxVolume);
                        setFamilyFilter(option.id);
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="catalog-control-group">
              <p className="metric-label">Difficulty Sort</p>
              <div className="catalog-chip-row" role="toolbar" aria-label="Case difficulty sort">
                {caseSortOptions.map((option) => {
                  const isSelected = caseSortMode === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`catalog-chip ${isSelected ? "selected" : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => {
                        playNavigateTone(sfxVolume);
                        setCaseSortMode(option.id);
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="catalog-control-group">
              <p className="metric-label">Run Difficulty</p>
              <div className="catalog-chip-row" role="toolbar" aria-label="Run difficulty selection">
                {runDifficultyOptions.map((option) => {
                  const isSelected = selectedRunDifficulty === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`catalog-chip ${isSelected ? "selected" : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => {
                        playNavigateTone(sfxVolume);
                        setSelectedRunDifficulty(option.id);
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="scene-copy small">{selectedRunDifficultyOption.description}</p>
            </div>
          </div>
          {unlockedFilteredCases.length === 0 ? (
            <p className="scene-copy small">
              No unlocked cases match this filter yet. Open another family or complete the current promotion review targets to unlock the next arc.
            </p>
          ) : null}
          <div className="case-meta-strip">
            <span className="panel-chip">{selectedCase.familyLabel}</span>
            <span className="panel-chip">{selectedCase.difficultyLabel}</span>
            <span className="panel-chip">{sortCountLabel}</span>
            <span className="panel-chip">{familyCountLabel}</span>
            <span className="panel-chip">Run {selectedRunDifficultyOption.label}</span>
          </div>
          <h2>{selectedCase.title}</h2>
          <p className="scene-copy small">{selectedCase.summary}</p>
          <p className="scene-copy small">
            {selectedCase.deadlineDays} day sprint | {selectedCase.stakeholders.length} stakeholders |{" "}
            {selectedCase.issues.length} expected issues
          </p>
          <div className="study-stat-grid">
            <article className="study-stat">
              <span className="metric-label">Runs</span>
              <strong>{selectedCaseStudy.timesPlayed}</strong>
            </article>
            <article className="study-stat">
              <span className="metric-label">Best Score</span>
              <strong>{selectedCaseStudy.bestScore === null ? "—" : `${selectedCaseStudy.bestScore}/100`}</strong>
            </article>
            <article className="study-stat">
              <span className="metric-label">Last Played</span>
              <strong>{selectedCaseStudy.lastPlayedAt ? formatSavedAt(selectedCaseStudy.lastPlayedAt) : "Never"}</strong>
            </article>
            <article className="study-stat">
              <span className="metric-label">Last Misses</span>
              <strong>{selectedCaseMissedIssueCount}</strong>
            </article>
          </div>
          <section className="practice-focus-panel" aria-label="Targeted replay">
            <div className="artifact-panel-header">
              <div>
                <p className="eyebrow">Targeted Replay</p>
                <h2>{selectedCaseReplayHeading}</h2>
              </div>
              <div className="panel-chip">{selectedCaseReplayBadge}</div>
            </div>
            <p className="scene-copy small">{selectedCaseReplaySummary}</p>
            {selectedCaseReplayReady ? (
              <div className="practice-focus-pills" aria-label="Missed issue focus">
                <span className="panel-chip">Focus: {selectedCaseIssueTrail}</span>
              </div>
            ) : null}
            <p className="scene-copy small practice-replay-note">{selectedCaseReplayNote}</p>
            <button
              className="menu-button selected practice-button"
              onClick={startPracticeReplay}
              disabled={!selectedCaseReplayReady}
            >
              <span className="menu-indicator">&gt;</span>
              <span>{selectedCaseReplayActionLabel}</span>
            </button>
          </section>
        </section>
        {practiceReplaySession ? (
          <section className="practice-banner" aria-live="polite">
            <p className="eyebrow">Practice Replay Queued</p>
            <h2>{selectedCase.title}</h2>
            <p className="scene-copy small">
              Focus mode is reloading this case with {practiceReplaySession.focusIssueIds.length} missed issue
              {practiceReplaySession.focusIssueIds.length === 1 ? "" : "s"} highlighted for review on{" "}
              {runDifficultyOptions.find((option) => option.id === practiceReplaySession.runDifficulty)?.label ??
                "Normal"} so the next pass stays anchored to the same control gaps.
            </p>
          </section>
        ) : null}
        <nav aria-label="Main menu">
          <ul className="menu-list">
            {menuItems.map((item, index) => {
              const isSelected = selectedIndex === index;

              return (
                <li key={item}>
                  <button
                    className={`menu-button ${isSelected ? "selected" : ""}`}
                    onMouseEnter={() => {
                      if (selectedIndex !== index) {
                        playNavigateTone(sfxVolume);
                      }
                      setSelectedIndex(index);
                    }}
                    onClick={() => {
                      playConfirmTone(sfxVolume);
                      if (item === "Options") {
                        setScene("options");
                      } else if (item === "New Game") {
                        startNewGame();
                      } else if (item === "Continue" && hasSaveData) {
                        setScene(continueScene);
                      } else if (item === "Credits") {
                        openCredits();
                      } else {
                        openNoSaveNotice();
                      }
                    }}
                  >
                    <span className="menu-indicator">{isSelected ? ">" : ""}</span>
                    <span>{item === "Continue" && !hasSaveData ? "Continue (No Save)" : item}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <p className="scene-copy small">
          Use Arrow Keys and Enter. Left and Right switch visible case files. Filter by family and sort above, and choose run difficulty to change starting evidence.
        </p>
        <p className="scene-copy small menu-save-label">
          {hasSaveData ? `Last saved: ${lastSavedLabel}` : lastSavedLabel}
        </p>
      </div>
      {menuAlert ? (
        <SceneModal
          title={menuAlert.title}
          body={menuAlert.body}
          actionLabel={menuAlert.actionLabel}
          onClose={closeMenuAlert}
        />
      ) : null}
    </section>
  );
}
