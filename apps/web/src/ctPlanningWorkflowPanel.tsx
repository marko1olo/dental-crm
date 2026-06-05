import type { CtPlanningWorkflowPlan } from "./ctPlanningWorkflowPlan";

const ownerLabels: Record<CtPlanningWorkflowPlan["phases"][number]["owner"], string> = {
  series: "серия",
  doctor: "врач",
  implant: "имплант",
  admin: "админ",
  lab: "лаборатория"
};

export function CtPlanningWorkflowPanel({ plan }: { plan: CtPlanningWorkflowPlan }) {
  const focusedPhaseId = plan.selectedPhaseId ?? plan.activePhaseId;

  return (
    <section
      className="ct-planning-workflow ct-planning-workflow-board"
      data-testid="ct-planning-workflow-board"
      aria-label="Динамический маршрут КТ-планирования"
    >
      <article className={`ct-planning-workflow-summary ${plan.status}`}>
        <span>Маршрут</span>
        <strong>{plan.score}%</strong>
        <p>{plan.summaryLabel}</p>
        <small>{plan.nextAction}</small>
      </article>
      {plan.selectedScenario ? (
        <article
          className={`ct-planning-workflow-focus ${plan.selectedScenario.status}`}
          data-testid="ct-planning-workflow-focus"
          {...plan.selectedScenario.viewerBridgeAttributes}
          aria-label="Текущий сценарий в маршруте КТ-планирования"
        >
          <span>Текущий сценарий</span>
          <strong>{plan.selectedScenario.title}</strong>
          <p>{plan.selectedScenario.detail}</p>
          <small>{plan.selectedScenario.routeLabel} · {plan.selectedScenario.confirmation}</small>
          <small>{plan.selectedScenario.viewerLabel}</small>
          <small>{plan.selectedScenario.viewerBridgeLabel}</small>
          {plan.selectedScenario.issueTitles.length > 0 ? (
            <div className="ct-planning-workflow-issues" data-testid="ct-planning-workflow-issues">
              {plan.selectedScenario.issueTitles.map((title) => (
                <em key={title}>{title}</em>
              ))}
            </div>
          ) : null}
          <small>{plan.selectedScenario.value} · {plan.selectedScenario.nextAction}</small>
        </article>
      ) : null}
      <div className="ct-planning-workflow-grid">
        {plan.phases.map((phase) => (
          <article
            className={`ct-planning-workflow-step ${phase.status} ${phase.id === focusedPhaseId ? "active" : ""}`}
            aria-current={phase.id === focusedPhaseId ? "step" : undefined}
            key={phase.id}
          >
            <span>{ownerLabels[phase.owner]}</span>
            <strong>{phase.title}</strong>
            <p>{phase.detail}</p>
            <small>{phase.value} · {phase.nextAction}</small>
          </article>
        ))}
      </div>
      {plan.warnings.length > 0 ? (
        <article className="ct-planning-workflow-warnings">
          <span>Блокеры</span>
          {plan.warnings.slice(0, 3).map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </article>
      ) : null}
    </section>
  );
}
