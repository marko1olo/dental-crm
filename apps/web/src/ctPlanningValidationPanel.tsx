import type { CtPlanningValidationSummary } from "./ctPlanningValidation";

type CtPlanningValidationGridProps = {
  summary: CtPlanningValidationSummary;
};

export function CtPlanningValidationGrid({ summary }: CtPlanningValidationGridProps) {
  return (
    <div className="ct-planning-validation-grid" data-testid="ct-planning-validation-grid" aria-label="Проверка готовности КТ-плана">
      <article className={`ct-planning-validation-card ${summary.status}`}>
        <span>Проверка</span>
        <strong>{summary.score}%</strong>
        <p>{summary.label}</p>
      </article>
      {summary.checks.map((check) => (
        <article className={`ct-planning-validation-card ${check.status}`} key={check.id}>
          <span>{check.title}</span>
          <strong>{check.value}</strong>
          <p>{check.detail}</p>
        </article>
      ))}
    </div>
  );
}
