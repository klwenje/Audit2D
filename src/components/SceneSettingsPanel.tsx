import { useGameStore } from "../store/useGameStore";
import { playNavigateTone } from "../utils/audio";

type SceneSettingsPanelProps = {
  eyebrow: string;
  title: string;
  intro: string;
  className?: string;
};

export function SceneSettingsPanel({
  eyebrow,
  title,
  intro,
  className,
}: SceneSettingsPanelProps) {
  const settings = useGameStore((state) => state.settings);
  const updateSettings = useGameStore((state) => state.updateSettings);

  return (
    <section className={`terminal-panel scene-settings-panel ${className ?? ""}`.trim()}>
      <div className="artifact-banner">
        <div>
          <p className="artifact-label">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span className="artifact-tag">Autosave On</span>
      </div>

      <p className="terminal-muted scene-settings-intro">{intro}</p>

      <label className="option-row">
        <span>Music Volume</span>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.musicVolume}
          onChange={(event) => updateSettings({ musicVolume: Number(event.target.value) })}
          onMouseUp={() => playNavigateTone(settings.sfxVolume)}
          onKeyUp={() => playNavigateTone(settings.sfxVolume)}
        />
      </label>

      <label className="option-row">
        <span>SFX Volume</span>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.sfxVolume}
          onChange={(event) => updateSettings({ sfxVolume: Number(event.target.value) })}
          onMouseUp={() => playNavigateTone(settings.sfxVolume)}
          onKeyUp={() => playNavigateTone(settings.sfxVolume)}
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
          onBlur={() => playNavigateTone(settings.sfxVolume)}
        >
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
        </select>
      </label>
    </section>
  );
}
