import { useEffect } from "react";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { OfficeScene } from "./scenes/OfficeScene";
import { OptionsScene } from "./scenes/OptionsScene";
import { PortfolioScene } from "./scenes/PortfolioScene";
import { ResultsScene } from "./scenes/ResultsScene";
import { SplashScene } from "./scenes/SplashScene";
import { WorkstationScene } from "./scenes/WorkstationScene";
import { useAuditStore } from "./store/useAuditStore";
import { useGameStore } from "./store/useGameStore";
import { clearSaveData, loadSaveData, writeSaveData } from "./utils/saveData";

function App() {
  const currentScene = useGameStore((state) => state.currentScene);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const settings = useGameStore((state) => state.settings);
  const saveLoaded = useGameStore((state) => state.saveLoaded);
  const setSaveLoaded = useGameStore((state) => state.setSaveLoaded);
  const hydrateGameStore = useGameStore((state) => state.hydrateFromSave);
  const hydrateAuditStore = useAuditStore((state) => state.hydrateFromSave);

  useEffect(() => {
    if (saveLoaded) {
      return;
    }

    const saveData = loadSaveData();
    if (!saveData) {
      setSaveLoaded(true);
      return;
    }

    hydrateAuditStore(saveData.audit);
    hydrateGameStore({
      currentScene: saveData.scene,
      settings: saveData.game.settings,
      playerPosition: saveData.game.playerPosition,
    });
  }, [hydrateAuditStore, hydrateGameStore, saveLoaded, setSaveLoaded]);

  useEffect(() => {
    if (!saveLoaded || currentScene === "splash") {
      return;
    }

    const auditSnapshot = useAuditStore.getState().getSnapshot();
    const hasMeaningfulAuditProgress =
      auditSnapshot.reviewedEvidenceIds.length > 0 ||
      auditSnapshot.interviewLogIds.length > 0 ||
      auditSnapshot.draftedFindings.length > 0 ||
      auditSnapshot.reportSubmitted ||
      auditSnapshot.workstationTab !== "inbox";

    if (currentScene === "mainMenu" && !hasMeaningfulAuditProgress) {
      clearSaveData();
      return;
    }

    writeSaveData({
      version: 1,
      savedAt: new Date().toISOString(),
      scene: currentScene,
      game: {
        settings,
        playerPosition,
      },
      audit: auditSnapshot,
    });
  }, [currentScene, playerPosition, saveLoaded, settings]);

  return (
    <main className="app-shell">
      {currentScene === "splash" && <SplashScene />}
      {currentScene === "mainMenu" && <MainMenuScene />}
      {currentScene === "portfolio" && <PortfolioScene />}
      {currentScene === "options" && <OptionsScene />}
      {currentScene === "office" && <OfficeScene />}
      {currentScene === "workstation" && <WorkstationScene />}
      {currentScene === "results" && <ResultsScene />}
    </main>
  );
}

export default App;
