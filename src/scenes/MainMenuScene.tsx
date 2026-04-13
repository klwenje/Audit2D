import { useEffect, useMemo, useState } from "react";
import { useAuditStore } from "../store/useAuditStore";
import { useGameStore } from "../store/useGameStore";
import { playConfirmTone, playNavigateTone } from "../utils/audio";
import { loadSaveData } from "../utils/saveData";
import {
  clearPracticeReplay,
  consumePracticeReplay,
  getCaseMasteryStats,
  loadPracticeReplay,
  queuePracticeReplay,
} from "../utils/studyProgress";

const menuItems = ["New Game", "Continue", "Options", "Credits"] as const;

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
  const [practiceReplaySession, setPracticeReplaySession] = useState(() => loadPracticeReplay());
  const saveData = loadSaveData();
  const continueScene = saveData?.scene && saveData.scene !== "splash" ? saveData.scene : "office";
  const hasSaveData = Boolean(saveData);
  const lastSavedLabel = saveData ? formatSavedAt(saveData.savedAt) : "No active save on disk";

  const selectedLabel = useMemo(() => menuItems[selectedIndex], [selectedIndex]);
  const selectedCaseIndex = useMemo(
    () => availableCases.findIndex((auditCase) => auditCase.id === selectedCaseId),
    [availableCases, selectedCaseId],
  );
  const selectedCase = availableCases[selectedCaseIndex] ?? availableCases[0];
  const selectedCaseStudy = useMemo(() => getCaseMasteryStats(selectedCase.id), [selectedCase.id]);
  const selectedCaseFocusLabels = useMemo(
    () =>
      selectedCaseStudy.lastMissedIssueIds
        .map((issueId) => selectedCase.issues.find((issue) => issue.id === issueId)?.title ?? issueId)
        .filter(Boolean),
    [selectedCase, selectedCaseStudy.lastMissedIssueIds],
  );

  const startNewGame = () => {
    clearPracticeReplay();
    setPracticeReplaySession(null);
    beginSelectedCase();
    resetOfficeState();
    setScene("office");
  };

  const startPracticeReplay = () => {
    if (selectedCaseStudy.lastMissedIssueIds.length === 0) {
      return;
    }

    queuePracticeReplay(selectedCase.id, selectedCaseStudy.lastMissedIssueIds);
    setPracticeReplaySession(loadPracticeReplay());
  };

  const cycleCase = (direction: -1 | 1) => {
    const nextIndex = (selectedCaseIndex + direction + availableCases.length) % availableCases.length;
    setSelectedCase(availableCases[nextIndex].id);
  };

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

      beginPracticeCase(session.caseId, session.focusIssueIds);
      resetOfficeState();
      setPracticeReplaySession(null);
      setScene("office");
    }, 500);

    return () => window.clearTimeout(timer);
  }, [beginPracticeCase, practiceReplaySession, resetOfficeState, setScene]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
          window.alert("Audit Desk Retro\nDesigned as a lightweight indie-style audit simulator.");
        } else {
          window.alert("No save data found yet. Start a run first, then Continue will resume it.");
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
  }, [continueScene, cycleCase, hasSaveData, selectedLabel, setScene, sfxVolume, startNewGame]);

  return (
    <section className="scene scene-menu">
      <div className="scene-card menu-card">
        <p className="eyebrow">Case File Zero</p>
        <h1>MAIN MENU</h1>
        <section className="case-select-card" aria-label="Case selection">
          <div className="case-select-header">
            <p className="eyebrow">Selected Engagement</p>
            <div className="case-select-controls">
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
              {practiceReplaySession.focusIssueIds.length === 1 ? "" : "s"} highlighted for review.
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
                        window.alert("Audit Desk Retro\nDesigned as a lightweight indie-style audit simulator.");
                      } else {
                        window.alert("No save data found yet. Start a run first, then Continue will resume it.");
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
          Use Arrow Keys and Enter. Left and Right switch case files.
        </p>
        <p className="scene-copy small menu-save-label">
          {hasSaveData ? `Last saved: ${lastSavedLabel}` : lastSavedLabel}
        </p>
      </div>
    </section>
  );
}
