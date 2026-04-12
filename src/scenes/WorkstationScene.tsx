import { useGameStore } from "../store/useGameStore";

export function WorkstationScene() {
  const setScene = useGameStore((state) => state.setScene);

  return (
    <section className="scene scene-workstation">
      <div className="scene-card workstation-card">
        <p className="eyebrow">Desk Terminal Online</p>
        <h1>WORKSTATION</h1>
        <p className="scene-copy">
          This confirms the office interaction loop is working. The next slice will
          turn this screen into the actual audit computer with inbox, evidence, and findings.
        </p>
        <div className="workstation-grid">
          <div className="workstation-panel">Inbox</div>
          <div className="workstation-panel">Case File</div>
          <div className="workstation-panel">Evidence</div>
          <div className="workstation-panel">Findings</div>
        </div>
        <button className="menu-button selected" onClick={() => setScene("office")}>
          <span className="menu-indicator">&lt;</span>
          <span>Leave Computer</span>
        </button>
      </div>
    </section>
  );
}
