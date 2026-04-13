import { useEffect, useMemo } from "react";
import { OfficeCanvas } from "../game/OfficeCanvas";
import { deskInteractZone, intersects, PLAYER_SIZE } from "../game/officeLayout";
import { useAuditStore } from "../store/useAuditStore";
import { useGameStore } from "../store/useGameStore";
import { playBackTone, playConfirmTone } from "../utils/audio";

export function OfficeScene() {
  const setScene = useGameStore((state) => state.setScene);
  const playerPosition = useGameStore((state) => state.playerPosition);
  const resetOfficeState = useGameStore((state) => state.resetOfficeState);
  const sfxVolume = useGameStore((state) => state.settings.sfxVolume);
  const auditCase = useAuditStore((state) => state.auditCase);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "e" && canUseDesk) {
        playConfirmTone(sfxVolume);
        setScene("workstation");
      }

      if (event.key === "Escape") {
        playBackTone(sfxVolume);
        setScene("mainMenu");
        resetOfficeState();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUseDesk, resetOfficeState, setScene, sfxVolume]);

  return (
    <section className="scene scene-office">
      <div className="scene-card office-card wide">
        <div className="office-header">
          <div>
            <p className="eyebrow">Day 01: Fieldwork Sprint</p>
            <h1>OFFICE FLOOR</h1>
            <p className="scene-copy small office-case-label">{auditCase.title}</p>
          </div>
          <div className="office-status">
            <span>Move: WASD / Arrows</span>
            <span>Menu: Esc</span>
          </div>
        </div>

        <OfficeCanvas />

        <p className="scene-copy small">
          Walk to the desk terminal on the right side of the room and press <strong>E</strong>.
        </p>
      </div>
    </section>
  );
}
