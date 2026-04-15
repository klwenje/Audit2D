import { useEffect, useRef } from "react";

type SceneHelpSection = {
  title: string;
  items: string[];
};

type SceneHelpOverlayProps = {
  title: string;
  intro: string;
  actionLabel: string;
  footer: string;
  sections: SceneHelpSection[];
  onClose: () => void;
};

export function SceneHelpOverlay({
  title,
  intro,
  actionLabel,
  footer,
  sections,
  onClose,
}: SceneHelpOverlayProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="scene-modal-backdrop scene-help-backdrop" role="presentation" onClick={onClose}>
      <section
        className="scene-card scene-modal scene-help-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scene-help-title"
        aria-describedby="scene-help-body"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="eyebrow">Field Guide</p>
        <h2 id="scene-help-title">{title}</h2>
        <p id="scene-help-body" className="scene-copy small">
          {intro}
        </p>

        <div className="help-grid">
          {sections.map((section) => (
            <article key={section.title} className="help-card">
              <p className="help-card-title">{section.title}</p>
              <ul className="bullet-list help-card-list">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="help-footer">
          <p className="scene-copy small help-footer-copy">{footer}</p>
          <button
            ref={closeButtonRef}
            type="button"
            className="menu-button scene-modal-button"
            onClick={onClose}
          >
            <span className="menu-indicator">&gt;</span>
            <span>{actionLabel}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
