import { create } from "zustand";

export type GameScene = "splash" | "mainMenu" | "options" | "office" | "workstation" | "results";

type PlayerPosition = {
  x: number;
  y: number;
};

type GameSettings = {
  musicVolume: number;
  sfxVolume: number;
  textSpeed: "slow" | "normal" | "fast";
};

type GameState = {
  currentScene: GameScene;
  saveLoaded: boolean;
  settings: GameSettings;
  playerPosition: PlayerPosition;
  setScene: (scene: GameScene) => void;
  setPlayerPosition: (position: PlayerPosition) => void;
  resetOfficeState: () => void;
  updateSettings: (nextSettings: Partial<GameSettings>) => void;
};

export const useGameStore = create<GameState>((set) => ({
  currentScene: "splash",
  saveLoaded: false,
  playerPosition: {
    x: 96,
    y: 240,
  },
  settings: {
    musicVolume: 70,
    sfxVolume: 80,
    textSpeed: "normal",
  },
  setScene: (scene) => set({ currentScene: scene }),
  setPlayerPosition: (position) => set({ playerPosition: position }),
  resetOfficeState: () =>
    set({
      playerPosition: {
        x: 96,
        y: 240,
      },
    }),
  updateSettings: (nextSettings) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...nextSettings,
      },
    })),
}));
