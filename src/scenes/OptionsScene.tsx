import { useGameStore } from "../store/useGameStore";
import { playBackTone } from "../utils/audio";
import { SceneSettingsPanel } from "../components/SceneSettingsPanel";

export function OptionsScene() {
  const setScene = useGameStore((state) => state.setScene);
  const settings = useGameStore((state) => state.settings);

  return (
    <section className="scene scene-options">
      <div className="scene-card options-card">
        <p className="eyebrow">System Settings</p>
        <h1>OPTIONS</h1>

        <SceneSettingsPanel
          eyebrow="System Settings"
          title="Terminal Controls"
          intro="These settings apply across the full game shell, including in-game pause screens."
        />

        <button
          className="menu-button selected"
          onClick={() => {
            playBackTone(settings.sfxVolume);
            setScene("mainMenu");
          }}
        >
          <span className="menu-indicator">&lt;</span>
          <span>Back</span>
        </button>
      </div>
    </section>
  );
}
