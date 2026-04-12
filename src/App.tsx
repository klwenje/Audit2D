import { MainMenuScene } from "./scenes/MainMenuScene";
import { OfficeScene } from "./scenes/OfficeScene";
import { OptionsScene } from "./scenes/OptionsScene";
import { ResultsScene } from "./scenes/ResultsScene";
import { SplashScene } from "./scenes/SplashScene";
import { WorkstationScene } from "./scenes/WorkstationScene";
import { useGameStore } from "./store/useGameStore";

function App() {
  const currentScene = useGameStore((state) => state.currentScene);

  return (
    <main className="app-shell">
      {currentScene === "splash" && <SplashScene />}
      {currentScene === "mainMenu" && <MainMenuScene />}
      {currentScene === "options" && <OptionsScene />}
      {currentScene === "office" && <OfficeScene />}
      {currentScene === "workstation" && <WorkstationScene />}
      {currentScene === "results" && <ResultsScene />}
    </main>
  );
}

export default App;
