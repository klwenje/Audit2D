import { useEffect, useMemo, useRef } from "react";
import {
  deskInteractZone,
  deskZone,
  furniture,
  intersects,
  isBlocked,
  OFFICE_HEIGHT,
  OFFICE_WIDTH,
  PLAYER_SIZE,
  PLAYER_SPEED,
  walls,
} from "./officeLayout";
import { useGameStore } from "../store/useGameStore";

const canvasWidth = OFFICE_WIDTH;
const canvasHeight = OFFICE_HEIGHT;

export function OfficeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pressedKeys = useRef<Set<string>>(new Set());

  const playerPosition = useGameStore((state) => state.playerPosition);
  const setPlayerPosition = useGameStore((state) => state.setPlayerPosition);

  const isNearDesk = useMemo(
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
      pressedKeys.current.add(event.key.toLowerCase());
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const tick = () => {
      const horizontal =
        (pressedKeys.current.has("arrowright") || pressedKeys.current.has("d") ? 1 : 0) -
        (pressedKeys.current.has("arrowleft") || pressedKeys.current.has("a") ? 1 : 0);
      const vertical =
        (pressedKeys.current.has("arrowdown") || pressedKeys.current.has("s") ? 1 : 0) -
        (pressedKeys.current.has("arrowup") || pressedKeys.current.has("w") ? 1 : 0);

      if (horizontal !== 0 || vertical !== 0) {
        const nextX = playerPosition.x + horizontal * PLAYER_SPEED;
        const nextY = playerPosition.y + vertical * PLAYER_SPEED;

        const nextHorizontal = {
          x: nextX,
          y: playerPosition.y,
          width: PLAYER_SIZE,
          height: PLAYER_SIZE,
        };
        const nextVertical = {
          x: playerPosition.x,
          y: nextY,
          width: PLAYER_SIZE,
          height: PLAYER_SIZE,
        };

        let updatedX = playerPosition.x;
        let updatedY = playerPosition.y;

        if (!isBlocked(nextHorizontal)) {
          updatedX = nextX;
        }

        if (!isBlocked(nextVertical)) {
          updatedY = nextY;
        }

        if (updatedX !== playerPosition.x || updatedY !== playerPosition.y) {
          setPlayerPosition({ x: updatedX, y: updatedY });
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playerPosition.x, playerPosition.y, setPlayerPosition]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    context.fillStyle = "#111a26";
    context.fillRect(0, 0, canvasWidth, canvasHeight);

    context.fillStyle = "#1a2a3a";
    context.fillRect(18, 18, canvasWidth - 36, canvasHeight - 36);

    context.fillStyle = "#21374d";
    for (let x = 30; x < canvasWidth - 30; x += 32) {
      context.fillRect(x, 28, 2, canvasHeight - 56);
    }

    context.fillStyle = "#294056";
    walls.forEach((wall) => {
      context.fillRect(wall.x, wall.y, wall.width, wall.height);
    });

    context.fillStyle = "#5e4d38";
    context.fillRect(deskZone.x, deskZone.y, deskZone.width, deskZone.height);

    context.fillStyle = "#79c2ff";
    context.fillRect(430, 92, 60, 34);
    context.fillStyle = "#0a1018";
    context.fillRect(436, 98, 48, 22);

    context.fillStyle = "#4f5b66";
    furniture.forEach((item, index) => {
      context.fillStyle = index === 3 ? "#5a7850" : index === 4 ? "#51606b" : "#4f5b66";
      context.fillRect(item.x, item.y, item.width, item.height);
    });

    context.strokeStyle = isNearDesk ? "#9de4b0" : "#4c677d";
    context.lineWidth = 2;
    context.strokeRect(
      deskInteractZone.x,
      deskInteractZone.y,
      deskInteractZone.width,
      deskInteractZone.height,
    );

    context.fillStyle = "#f6cf65";
    context.fillRect(playerPosition.x, playerPosition.y, PLAYER_SIZE, PLAYER_SIZE);
    context.fillStyle = "#0f141b";
    context.fillRect(playerPosition.x + 5, playerPosition.y + 4, 3, 3);
    context.fillRect(playerPosition.x + 10, playerPosition.y + 4, 3, 3);
    context.fillRect(playerPosition.x + 6, playerPosition.y + 11, 7, 2);

    context.fillStyle = "#d6e1f0";
    context.font = '12px "Trebuchet MS", Verdana, sans-serif';
    context.fillText("Records", 93, 76);
    context.fillText("Plant", 151, 87);
    context.fillText("Meeting Table", 267, 235);
    context.fillText("Desk Terminal", 404, 72);
  }, [isNearDesk, playerPosition.x, playerPosition.y]);

  return (
    <div className="office-canvas-shell">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="office-canvas"
      />
      {isNearDesk && (
        <div className="interaction-hint">
          Press <strong>E</strong> to use computer
        </div>
      )}
    </div>
  );
}

