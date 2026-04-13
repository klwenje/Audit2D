import { useEffect, useMemo, useState } from "react";
import { useAuditStore } from "../store/useAuditStore";
import { useGameStore } from "../store/useGameStore";

const menuItems = ["New Game", "Continue", "Options", "Credits"] as const;

export function MainMenuScene() {
  const setScene = useGameStore((state) => state.setScene);
  const resetOfficeState = useGameStore((state) => state.resetOfficeState);
  const availableCases = useAuditStore((state) => state.availableCases);
  const selectedCaseId = useAuditStore((state) => state.selectedCaseId);
  const setSelectedCase = useAuditStore((state) => state.setSelectedCase);
  const beginSelectedCase = useAuditStore((state) => state.beginSelectedCase);
  const [selectedIndex, setSelectedIndex] = useState(0);

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
        setSelectedIndex((current) => (current - 1 + menuItems.length) % menuItems.length);
      }

      if (event.key === "ArrowDown") {
        setSelectedIndex((current) => (current + 1) % menuItems.length);
      }

      if (event.key === "Enter") {
        if (selectedLabel === "Options") {
          setScene("options");
        } else if (selectedLabel === "New Game") {
          startNewGame();
        } else if (selectedLabel === "Credits") {
          window.alert("Audit Desk Retro\nDesigned as a lightweight indie-style audit simulator.");
        } else {
          window.alert("Continue will be wired once save data exists.");
        }
      }

      if (event.key === "ArrowLeft") {
        cycleCase(-1);
      }

      if (event.key === "ArrowRight") {
        cycleCase(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cycleCase, selectedLabel, setScene, startNewGame]);

  return (
    <section className="scene scene-menu">
      <div className="scene-card menu-card">
        <p className="eyebrow">Case File Zero</p>
        <h1>MAIN MENU</h1>
        <section className="case-select-card" aria-label="Case selection">
          <div className="case-select-header">
            <p className="eyebrow">Selected Engagement</p>
            <div className="case-select-controls">
              <button className="case-switch-button" onClick={() => cycleCase(-1)} aria-label="Previous case">
                &lt;
              </button>
              <button className="case-switch-button" onClick={() => cycleCase(1)} aria-label="Next case">
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
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => {
                      if (item === "Options") {
                        setScene("options");
                      } else if (item === "New Game") {
                        startNewGame();
                      } else if (item === "Credits") {
                        window.alert("Audit Desk Retro\nDesigned as a lightweight indie-style audit simulator.");
                      } else {
                        window.alert("Continue will be wired once save data exists.");
                      }
                    }}
                  >
                    <span className="menu-indicator">{isSelected ? ">" : ""}</span>
                    <span>{item}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <p className="scene-copy small">
          Use Arrow Keys and Enter. Left and Right switch case files.
        </p>
      </div>
    </section>
  );
}
