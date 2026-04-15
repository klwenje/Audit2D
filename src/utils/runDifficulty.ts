export type RunDifficulty = "easy" | "normal" | "hard";

export const runDifficultyOptions: Array<{
  id: RunDifficulty;
  label: string;
  description: string;
}> = [
  {
    id: "easy",
    label: "Easy",
    description: "Shows more directly relevant evidence and guidance up front.",
  },
  {
    id: "normal",
    label: "Normal",
    description: "Keeps the current balanced case flow.",
  },
  {
    id: "hard",
    label: "Hard",
    description: "Starts leaner, with more evidence and guidance revealed later.",
  },
];

export function normalizeRunDifficulty(value: unknown): RunDifficulty {
  return value === "easy" || value === "hard" ? value : "normal";
}

