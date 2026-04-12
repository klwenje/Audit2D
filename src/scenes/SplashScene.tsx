import { useEffect } from "react";
import { useGameStore } from "../store/useGameStore";

export function SplashScene() {
  const setScene = useGameStore((state) => state.setScene);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        setScene("mainMenu");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setScene]);

  return (
    <section className="scene scene-splash">
      <div className="scanlines" aria-hidden="true" />
      <div className="scene-card title-card">
        <p className="eyebrow">Internal IT Audit Simulator</p>
        <h1>AUDIT DESK RETRO</h1>
        <p className="scene-copy">
          Step into the office. Review the evidence. Write the finding.
        </p>
        <p className="press-start">Press Enter</p>
      </div>
    </section>
  );
}
