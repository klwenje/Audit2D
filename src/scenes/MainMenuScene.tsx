import { useEffect, useMemo, useState } from "react";
import { useAuditStore } from "../store/useAuditStore";
import { useGameStore } from "../store/useGameStore";
import { playConfirmTone, playNavigateTone } from "../utils/audio";
import { loadSaveData } from "../utils/saveData";

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
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  const startNewGame = () => {
    beginSelectedCase();
    resetOfficeState();
    setScene("office");
  };

  const cycleCase = (direction: -1 | 1) => {
    const nextIndex = (selectedCaseIndex + direction + availableCases.length) % availableCases.length;
    setSelectedCase(availableCases[nextIndex].id);
  };

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
        </section>
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
