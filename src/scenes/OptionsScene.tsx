import { useGameStore } from "../store/useGameStore";

export function OptionsScene() {
  const setScene = useGameStore((state) => state.setScene);
  const settings = useGameStore((state) => state.settings);
  const updateSettings = useGameStore((state) => state.updateSettings);

  return (
    <section className="scene scene-options">
      <div className="scene-card options-card">
        <p className="eyebrow">System Settings</p>
        <h1>OPTIONS</h1>

        <label className="option-row">
          <span>Music Volume</span>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.musicVolume}
            onChange={(event) =>
              updateSettings({ musicVolume: Number(event.target.value) })
            }
          />
        </label>

        <label className="option-row">
          <span>SFX Volume</span>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.sfxVolume}
            onChange={(event) =>
              updateSettings({ sfxVolume: Number(event.target.value) })
            }
          />
        </label>

        <label className="option-row">
          <span>Text Speed</span>
          <select
            value={settings.textSpeed}
            onChange={(event) =>
              updateSettings({
                textSpeed: event.target.value as "slow" | "normal" | "fast",
              })
            }
          >
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
        </label>

        <button className="menu-button selected" onClick={() => setScene("mainMenu")}>
          <span className="menu-indicator">&lt;</span>
          <span>Back</span>
        </button>
      </div>
    </section>
  );
}
