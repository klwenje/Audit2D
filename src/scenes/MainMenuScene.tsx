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
import {
  clearPracticeReplay,
  consumePracticeReplay,
  getCaseMasteryStats,
  getStudyMomentumSummary,
  loadPracticeReplay,
  queuePracticeReplay,
} from "../utils/studyProgress";
import { SceneModal } from "../components/SceneModal";

const menuItems = ["New Game", "Continue", "Options", "Credits"] as const;

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

export function MainMenuScene() {
  const setScene = useGameStore((state) => state.setScene);
  const resetOfficeState = useGameStore((state) => state.resetOfficeState);
  const sfxVolume = useGameStore((state) => state.settings.sfxVolume);
  const availableCases = useAuditStore((state) => state.availableCases);
  const selectedCaseId = useAuditStore((state) => state.selectedCaseId);
  const setSelectedCase = useAuditStore((state) => state.setSelectedCase);
  const beginSelectedCase = useAuditStore((state) => state.beginSelectedCase);
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
  const filteredCases = useMemo(
    () => sortCaseCatalog(filterCaseCatalog(caseCatalog, familyFilter), caseSortMode),
    [caseCatalog, familyFilter, caseSortMode],
  );
  const selectedCaseIndex = useMemo(
    () => filteredCases.findIndex((auditCase) => auditCase.id === selectedCaseId),
    [filteredCases, selectedCaseId],
  );
  const selectedCase = filteredCases[selectedCaseIndex] ?? filteredCases[0] ?? caseCatalog[0];
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

  const startNewGame = () => {
    setMenuAlert(null);
    clearPracticeReplay();
    setPracticeReplaySession(null);
    beginSelectedCase(selectedRunDifficulty);
    resetOfficeState();
    setScene("office");
  };

  const startPracticeReplay = () => {
    if (selectedCaseStudy.lastMissedIssueIds.length === 0) {
      return;
    }

    queuePracticeReplay(selectedCase.id, selectedCaseStudy.lastMissedIssueIds, selectedRunDifficulty);
    setPracticeReplaySession(loadPracticeReplay());
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
    if (filteredCases.length === 0) {
      return;
    }

    const nextIndex = (selectedCaseIndex + direction + filteredCases.length) % filteredCases.length;
    setSelectedCase(filteredCases[nextIndex].id);
  };

  useEffect(() => {
    if (filteredCases.length === 0) {
      return;
    }

    if (!filteredCases.some((auditCase) => auditCase.id === selectedCaseId)) {
      setSelectedCase(filteredCases[0].id);
    }
  }, [filteredCases, selectedCaseId, setSelectedCase]);

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
            {studyMomentum.replayReadyCases} cases ready for targeted replay.
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
        <section className="case-select-card" aria-label="Case selection">
          <div className="case-select-header">
            <p className="eyebrow">Selected Engagement</p>
            <div className="case-select-controls">
              <div className="panel-chip case-count-chip">
                {filteredCases.length}/{availableCases.length} in view
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
              <strong>{selectedCaseStudy.lastMissedIssueIds.length}</strong>
            </article>
          </div>
          {selectedCaseFocusLabels.length > 0 ? (
            <section className="practice-focus-panel" aria-label="Practice focus">
              <p className="eyebrow">Practice Focus</p>
              <p className="scene-copy small">{selectedCaseFocusLabels.join(", ")}</p>
              <button className="menu-button practice-button" onClick={startPracticeReplay}>
                <span className="menu-indicator">&gt;</span>
                <span>Practice Missed Issues</span>
              </button>
            </section>
          ) : (
            <p className="scene-copy small practice-empty">
              Complete a run to unlock targeted replay for this case.
            </p>
          )}
        </section>
        {practiceReplaySession ? (
          <section className="practice-banner" aria-live="polite">
            <p className="eyebrow">Practice Replay Queued</p>
            <h2>{selectedCase.title}</h2>
            <p className="scene-copy small">
              Focus mode is reloading this case with {practiceReplaySession.focusIssueIds.length} missed issue
              {practiceReplaySession.focusIssueIds.length === 1 ? "" : "s"} highlighted for review on{" "}
              {runDifficultyOptions.find((option) => option.id === practiceReplaySession.runDifficulty)?.label ??
                "Normal"}.
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
