import type { CtPlanningTaskSnapshot } from "./ctPlanningState";

export type CtPlanningGeometryGridPanelProps = {
  planningSnapshot: CtPlanningTaskSnapshot;
};

export function CtPlanningGeometryGridPanel({
  planningSnapshot,
}: CtPlanningGeometryGridPanelProps) {
  if (planningSnapshot.geometrySummary.metrics.length === 0) {
    return null;
  }
  return (
    <div
      className="ct-planning-geometry-grid"
      data-testid="ct-planning-geometry-grid"
      aria-label="Расчетные измерения КТ-плана"
    >
      {planningSnapshot.geometrySummary.metrics.map((metric) => (
        <article
          className={`ct-planning-geometry-card ${metric.tone}`}
          key={metric.id}
        >
          <span>{metric.title}</span>
          <strong>{metric.valueLabel}</strong>
          <p>{metric.detail}</p>
          <small>{metric.source}</small>
        </article>
      ))}
    </div>
  );
}
