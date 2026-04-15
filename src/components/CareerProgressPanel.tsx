import type { CareerProgressSummary } from "../utils/studyProgress";

type CareerProgressPanelProps = {
  summary: CareerProgressSummary;
  eyebrow: string;
  title: string;
  contextLabel: string;
  className?: string;
};

function formatCaseCoverage(touchedCases: number, totalCases: number) {
  return `${touchedCases}/${totalCases}`;
}

export function CareerProgressPanel({
  summary,
  eyebrow,
  title,
  contextLabel,
  className,
}: CareerProgressPanelProps) {
  const progressPercent = summary.nextPromotion?.progressPercent ?? 100;
  const progressLabel = summary.nextPromotion
    ? `${summary.careerXp}/${summary.nextPromotion.minXp} career points`
    : `${summary.careerXp} career points`;
  const highBandCases = summary.strongCases + summary.masteredCases;

  return (
    <section className={`terminal-panel career-panel ${className ?? ""}`.trim()}>
      <div className="artifact-panel-header career-panel-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <div className="panel-chip">{contextLabel}</div>
      </div>

      <div className="career-title-row">
        <div>
          <p className="career-title-label">Current Title</p>
          <h3>{summary.careerTitle}</h3>
        </div>
        <div className="career-level-chip">Level {summary.careerLevel}</div>
      </div>

      <div className="career-band-summary">
        <div className="career-band-summary-chip">{summary.masteryBand.label}</div>
        <p className="scene-copy small">{summary.masteryBand.description}</p>
      </div>

      <div className="career-meter" aria-label="Promotion progress">
        <div className="career-meter-head">
          <span className="metric-label">Promotion Progress</span>
          <strong>{progressLabel}</strong>
        </div>
        <div className="career-meter-track" aria-hidden="true">
          <div className="career-meter-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="career-meter-foot">
          <span>{summary.nextPromotion ? `Next: ${summary.nextPromotion.title}` : "Max career tier reached"}</span>
          <span>{summary.nextPromotion ? `${summary.nextPromotion.xpNeeded} points to go` : "Portfolio is fully promoted"}</span>
        </div>
      </div>

      <div className="career-stat-grid">
        <article className="career-stat-card">
          <span className="metric-label">Cases Touched</span>
          <strong>{formatCaseCoverage(summary.casesTouched, summary.totalCases)}</strong>
        </article>
        <article className="career-stat-card">
          <span className="metric-label">High-Band Cases</span>
          <strong>{highBandCases}</strong>
        </article>
        <article className="career-stat-card">
          <span className="metric-label">Recent Strong Run</span>
          <strong>{summary.recentStrongCaseStreak}</strong>
        </article>
        <article className="career-stat-card">
          <span className="metric-label">Coverage Families</span>
          <strong>{summary.categoryCoverage.filter((entry) => entry.touchedCases > 0).length}</strong>
        </article>
      </div>

      <div className="career-band-grid" aria-label="Mastery bands">
        {summary.masteryBands.map((band) => (
          <article key={band.key} className={`career-band-card ${band.key}`}>
            <div className="career-band-head">
              <span className="career-band-label">{band.label}</span>
              <strong>{band.count}</strong>
            </div>
            <p>{band.description}</p>
          </article>
        ))}
      </div>

      <div className="career-coverage-block">
        <div className="career-coverage-head">
          <span className="metric-label">Category Coverage</span>
          <strong>{summary.categoryCoverage.filter((entry) => entry.touchedCases > 0).length}/{summary.categoryCoverage.length}</strong>
        </div>
        <div className="career-coverage-grid">
          {summary.categoryCoverage.map((entry) => (
            <article key={entry.familyId} className="career-coverage-card">
              <div className="career-coverage-card-head">
                <span>{entry.familyLabel}</span>
                <strong>{entry.coveragePercent}%</strong>
              </div>
              <div className="career-coverage-track" aria-hidden="true">
                <div className="career-coverage-fill" style={{ width: `${entry.coveragePercent}%` }} />
              </div>
              <p>
                {entry.touchedCases}/{entry.totalCases} cases
              </p>
            </article>
          ))}
        </div>
      </div>

      <p className="career-next-step">{summary.nextMilestoneMessage}</p>
    </section>
  );
}
