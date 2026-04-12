import { useGameStore } from "../store/useGameStore";

export function OfficeScene() {
  const setScene = useGameStore((state) => state.setScene);

  return (
    <section className="scene scene-office">
      <div className="scene-card office-card">
        <p className="eyebrow">Playable Room Coming Next</p>
        <h1>OFFICE</h1>
        <p className="scene-copy">
          This is the handoff point for the next slice. The next commit will replace
          this placeholder with a top-down room, keyboard movement, and desk interaction.
        </p>
        <button className="menu-button selected" onClick={() => setScene("mainMenu")}>
          <span className="menu-indicator">&lt;</span>
          <span>Return to Menu</span>
        </button>
      </div>
    </section>
  );
}
