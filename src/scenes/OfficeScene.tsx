import { useEffect, useMemo, useState } from "react";
import { OfficeCanvas } from "../game/OfficeCanvas";
import { deskInteractZone, intersects, PLAYER_SIZE } from "../game/officeLayout";
import { useAuditStore } from "../store/useAuditStore";
import { useGameStore } from "../store/useGameStore";
import { playBackTone, playConfirmTone } from "../utils/audio";
import { SceneHelpOverlay } from "../components/SceneHelpOverlay";
import { ScenePauseOverlay } from "../components/ScenePauseOverlay";

export function OfficeScene() {
  const setScene = useGameStore((state) => state.setScene);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const resetOfficeState = useGameStore((state) => state.resetOfficeState);
  const sfxVolume = useGameStore((state) => state.settings.sfxVolume);
  const auditCase = useAuditStore((state) => state.auditCase);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);

  const canUseDesk = useMemo(
    () =>
      intersects(
        {
          x: playerPosition.x,
          y: playerPosition.y,
          width: PLAYER_SIZE,
          height: PLAYER_SIZE,
        },
        deskInteractZone,
      ),
    [playerPosition.x, playerPosition.y],
  );

  const openHelpOverlay = () => {
    playConfirmTone(sfxVolume);
    setHelpOpen(true);
  };

  const closeHelpOverlay = () => {
    playBackTone(sfxVolume);
    setHelpOpen(false);
  };

  const openPauseOverlay = () => {
    playConfirmTone(sfxVolume);
    setPauseOpen(true);
  };

  const closePauseOverlay = () => {
    playBackTone(sfxVolume);
    setPauseOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (helpOpen) {
        return;
      }

      if (pauseOpen) {
        return;
      }

      if (event.key.toLowerCase() === "h" || event.key === "?") {
        event.preventDefault();
        openHelpOverlay();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        openPauseOverlay();
        return;
      }

      if (event.key.toLowerCase() === "e" && canUseDesk) {
        playConfirmTone(sfxVolume);
        setScene("workstation");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUseDesk, helpOpen, pauseOpen, setScene, sfxVolume]);

  return (
    <section className="scene scene-office">
      <div className="scene-card office-card wide">
        <div className="office-header">
          <div>
            <p className="eyebrow">Day 01: Fieldwork Sprint</p>
            <h1>OFFICE FLOOR</h1>
            <p className="scene-copy small office-case-label">{auditCase.title}</p>
            <p className="scene-copy small office-brief">
              Fluorescent records room. Archive wall to the left, meeting table in the middle,
              terminal desk on the right.
            </p>
          </div>
          <div className="office-status">
            <span>Move: WASD / Arrows</span>
            <span>Use desk: E</span>
            <button type="button" className="panel-chip panel-chip-button" onClick={openPauseOverlay}>
              Pause: Esc
            </button>
            <button type="button" className="panel-chip panel-chip-button" onClick={openHelpOverlay}>
              Help: H
            </button>
          </div>
        </div>

        <OfficeCanvas />

        <p className="scene-copy small">
          Walk to the desk terminal on the right side of the room and press <strong>E</strong>.
        </p>
      </div>

      {helpOpen && (
        <SceneHelpOverlay
          title="Office Floor Controls"
          intro="You are still inside the simulation shell. This overlay pauses the room flow and gives you a quick control reference."
          actionLabel="Resume Floor"
          footer="Press Esc or use the resume button to return to the office."
          sections={[
            {
              title: "Movement",
              items: ["Use WASD or the Arrow Keys to walk around the room.", "Reach the terminal desk on the right side of the office."],
            },
            {
              title: "Desk Access",
              items: ["Press E when you are at the desk to open the workstation.", "Esc leaves the office and returns you to the main menu."],
            },
            {
              title: "Study Tip",
              items: ["Treat the office like a staging area before fieldwork begins.", "Use this room to orient yourself before starting the audit."],
            },
          ]}
          onClose={closeHelpOverlay}
        />
      )}

        {pauseOpen && (
          <ScenePauseOverlay
            title="Office Floor Paused"
            intro="You can adjust your session settings, then jump back into the fieldwork loop without leaving the simulation."
            resumeLabel="Resume Office"
            secondaryActionLabel="Return to Menu"
            secondaryActionHint="Leaving the office will reset your floor position and send you back to the main menu."
            onResume={closePauseOverlay}
            onSecondaryAction={() => {
              closePauseOverlay();
              resetOfficeState();
              setScene("mainMenu");
            }}
          />
        )}
    </section>
  );
}
