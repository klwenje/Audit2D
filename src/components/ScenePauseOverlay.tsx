import { useEffect, useRef } from "react";
import { playBackTone, playConfirmTone } from "../utils/audio";
import { useGameStore } from "../store/useGameStore";
import { SceneSettingsPanel } from "./SceneSettingsPanel";

type ScenePauseOverlayProps = {
  title: string;
  intro: string;
  resumeLabel: string;
  secondaryActionLabel?: string;
  secondaryActionHint?: string;
  onResume: () => void;
  onSecondaryAction?: () => void;
};

export function ScenePauseOverlay({
  title,
  intro,
  resumeLabel,
  secondaryActionLabel,
  secondaryActionHint,
  onResume,
  onSecondaryAction,
}: ScenePauseOverlayProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const sfxVolume = useGameStore((state) => state.settings.sfxVolume);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onResume();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onResume]);

  return (
    <div className="scene-modal-backdrop scene-pause-backdrop" role="presentation" onClick={onResume}>
      <section
        className="scene-card scene-modal scene-pause-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scene-pause-title"
        aria-describedby="scene-pause-body"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pause-shell-grid">
          <div className="pause-shell-summary">
            <p className="eyebrow">Pause Menu</p>
            <h2 id="scene-pause-title">{title}</h2>
            <p id="scene-pause-body" className="scene-copy small">
              {intro}
            </p>

            <div className="pause-status-strip" aria-label="Pause status">
              <span>Esc resumes</span>
              <span>Settings persist automatically</span>
            </div>

            <div className="pause-actions">
              <button ref={closeButtonRef} className="menu-button selected" onClick={onResume}>
                <span className="menu-indicator">&gt;</span>
                <span>{resumeLabel}</span>
              </button>
              {secondaryActionLabel ? (
                <button
                  className="menu-button"
                  onClick={() => {
                    playConfirmTone(sfxVolume);
                    onSecondaryAction?.();
                  }}
                >
                  <span className="menu-indicator">&lt;</span>
                  <span>{secondaryActionLabel}</span>
                </button>
              ) : null}
            </div>

            {secondaryActionHint ? (
              <p className="scene-copy small pause-hint">{secondaryActionHint}</p>
            ) : null}
          </div>

          <div className="pause-shell-settings">
            <SceneSettingsPanel
              eyebrow="Live Session"
              title="Settings"
              intro="Adjust your audio mix and reading speed without leaving the simulation shell."
              className="pause-settings-panel"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
