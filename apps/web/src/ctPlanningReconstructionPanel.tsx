import type { CtPlanningReconstructionPlan } from "./ctPlanningReconstruction";

type CtPlanningReconstructionPanelProps = {
  plan: CtPlanningReconstructionPlan;
};

export function CtPlanningReconstructionPanel({ plan }: CtPlanningReconstructionPanelProps) {
  return (
    <div className="ct-planning-reconstruction-board" data-testid="ct-planning-reconstruction-board" aria-label="Построение ОПТГ и поперечных КТ-срезов">
      <article className={`ct-planning-reconstruction-summary ${plan.status}`}>
        <span>ОПТГ и срезы</span>
        <strong>
          {plan.crossSectionCount > 0 ? `${plan.crossSectionCount} срезов` : "нужна дуга"}
        </strong>
        <p>
          {plan.curveLengthMm === null
            ? "План реконструкции появится после разметки дуги."
            : `Дуга ${plan.curveLengthMm} мм, шаг ${plan.crossSectionStepMm} мм, слой ${plan.slabMm} мм.`}
        </p>
        <small>{plan.qualityLabel}</small>
        <small>
          покрытие {plan.crossSectionCoveragePercent}% · станции {plan.crossSectionStationPreview}
        </small>
      </article>
      <div className="ct-planning-reconstruction-grid">
        {plan.cards.map((card) => (
          <article className={`ct-planning-reconstruction-card ${card.status}`} key={card.id}>
            <span>{card.title}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
            <small>{card.nextAction}</small>
          </article>
        ))}
      </div>
      {plan.warnings.length > 0 ? (
        <div className="ct-planning-reconstruction-warnings" aria-label="Предупреждения по построению ОПТГ">
          <span>Контроль</span>
          <p>{plan.warnings.join(" · ")}</p>
        </div>
      ) : null}
    </div>
  );
}
