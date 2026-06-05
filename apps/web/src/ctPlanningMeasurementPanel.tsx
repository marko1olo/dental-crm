import type { CtPlanningMeasurementPlan } from "./ctPlanningMeasurementPlan";

type CtPlanningMeasurementPanelProps = {
  plan: CtPlanningMeasurementPlan;
};

export function CtPlanningMeasurementPanel({ plan }: CtPlanningMeasurementPanelProps) {
  return (
    <section className="ct-planning-measurement-board" data-testid="ct-planning-measurement-board" aria-label="Карта измерений КТ-плана">
      <article className={`ct-planning-measurement-summary ${plan.status}`}>
        <span>Карта измерений</span>
        <strong>{plan.score}%</strong>
        <p>{plan.summaryLabel}</p>
        <small>
          Контуры {plan.roiAreaTotalLabel} / {plan.roiVolumeTotalLabel} · плотность {plan.densityValueCount}/{plan.densityProbeCount}
        </small>
        <small>{plan.densityProtocolLabel}</small>
        <small>
          ширина/высота {plan.ridgeWidthCount}/{plan.boneHeightCount} · отступ {plan.clearanceRoleCount}
        </small>
      </article>
      <div className="ct-planning-measurement-grid">
        {plan.cards.map((card) => (
          <article className={`ct-planning-measurement-card ${card.status}`} key={card.id}>
            <span>{card.title}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
            <small>{card.nextAction}</small>
          </article>
        ))}
      </div>
      {plan.warnings.length > 0 ? (
        <div className="ct-planning-measurement-warnings" aria-label="Предупреждения по измерениям КТ">
          {plan.warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
