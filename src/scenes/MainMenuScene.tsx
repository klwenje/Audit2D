import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "../store/useGameStore";

const menuItems = ["New Game", "Continue", "Options", "Credits"] as const;

export function MainMenuScene() {
  const setScene = useGameStore((state) => state.setScene);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedLabel = useMemo(() => menuItems[selectedIndex], [selectedIndex]);

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
          setScene("office");
        } else if (selectedLabel === "Credits") {
          window.alert("Audit Desk Retro\nDesigned as a lightweight indie-style audit simulator.");
        } else {
          window.alert("Continue will be wired once save data exists.");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedLabel, setScene]);

  return (
    <section className="scene scene-menu">
      <div className="scene-card menu-card">
        <p className="eyebrow">Case File Zero</p>
        <h1>MAIN MENU</h1>
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
                        setScene("office");
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
          Use Arrow Keys and Enter.
        </p>
      </div>
    </section>
  );
}
