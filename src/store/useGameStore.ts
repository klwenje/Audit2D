import { create } from "zustand";

export type GameScene = "splash" | "mainMenu" | "options" | "office" | "workstation" | "results";

type GameSettings = {
  musicVolume: number;
  sfxVolume: number;
  textSpeed: "slow" | "normal" | "fast";
};

type GameState = {
  currentScene: GameScene;
  saveLoaded: boolean;
  settings: GameSettings;
  setScene: (scene: GameScene) => void;
  updateSettings: (nextSettings: Partial<GameSettings>) => void;
};

export const useGameStore = create<GameState>((set) => ({
  currentScene: "splash",
  saveLoaded: false,
  settings: {
    musicVolume: 70,
    sfxVolume: 80,
    textSpeed: "normal",
  },
  setScene: (scene) => set({ currentScene: scene }),
  updateSettings: (nextSettings) =>
    set((state) => ({
      settings: {
        ...state.settings,
        ...nextSettings,
      },
    })),
}));
