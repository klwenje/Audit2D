import type { AuditStateSnapshot } from "../store/useAuditStore";
import type { GameScene, GameSettings, PlayerPosition } from "../store/useGameStore";

const SAVE_KEY = "audit-desk-retro-save-v1";

export type SaveData = {
  version: 1;
  savedAt: string;
  scene: GameScene;
  game: {
    settings: GameSettings;
    playerPosition: PlayerPosition;
  };
  audit: AuditStateSnapshot;
};

export function loadSaveData() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SAVE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SaveData;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSaveData(saveData: SaveData) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

export function clearSaveData() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SAVE_KEY);
}
