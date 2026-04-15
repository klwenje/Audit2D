import { useEffect, useRef } from "react";

type SceneModalProps = {
  title: string;
  body: string;
  actionLabel: string;
  onClose: () => void;
};

export function SceneModal({ title, body, actionLabel, onClose }: SceneModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <div className="scene-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="scene-card scene-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scene-modal-title"
        aria-describedby="scene-modal-body"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">System Bulletin</p>
        <h2 id="scene-modal-title">{title}</h2>
        <p id="scene-modal-body" className="scene-copy small">
          {body}
        </p>
        <div className="scene-modal-actions">
          <button ref={closeButtonRef} className="menu-button scene-modal-button" onClick={onClose}>
            <span className="menu-indicator">&gt;</span>
            <span>{actionLabel}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
