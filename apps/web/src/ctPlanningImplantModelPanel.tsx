import type { CtPlanningImplantModelPlan, CtPlanningLocal3DReadinessPlan } from "./ctPlanningImplantModel";

type CtPlanningImplantModelPanelProps = {
  plan: CtPlanningImplantModelPlan;
  local3DReadinessPlan?: CtPlanningLocal3DReadinessPlan | null;
};

function buildLocal3DOperatorSummary(plan: CtPlanningLocal3DReadinessPlan) {
  const readyCount = plan.cards.filter((card) => card.status === "ready").length;
  const draftCards = plan.cards.filter((card) => card.status === "draft");
  const blockedCards = plan.cards.filter((card) => card.status === "blocked");
  const bridgeCards = plan.cards.filter((card) => card.requiresLocalBridge);
  const blockedTitles = blockedCards.map((card) => card.title).join(", ");
  const bridgeTitles = bridgeCards.map((card) => card.title).join(", ");
  const totalCount = plan.cards.length;

  if (blockedCards.length > 0) {
    return {
      status: "blocked" as const,
      value: `готово ${readyCount}/${totalCount}`,
      detail: `Проверьте модельные файлы кейса: ${blockedTitles}.`,
      nextAction: "CRM хранит только метаданные; поверхности, дуги, скан-боди и шаблон открываются вне браузера."
    };
  }

  if (draftCards.length > 0) {
    return {
      status: "draft" as const,
      value: `готово ${readyCount}/${totalCount}`,
      detail: bridgeCards.length > 0 ? `Нужен доступный локальный 3D-модуль для: ${bridgeTitles}.` : "Кейс можно оставить как метаданные до лабораторной сверки.",
      nextAction: "Перед передачей в лабораторию подтвердите локальный 3D-модуль или внешний просмотр."
    };
  }

  return {
    status: "ready" as const,
    value: `готово ${readyCount}/${totalCount}`,
    detail: bridgeCards.length > 0 ? "Локальный 3D-модуль подтвержден для нужных поверхностей." : "Метаданные поверхностей и дуг готовы для лабораторного маршрута.",
    nextAction: "Передайте лаборатории пакет готовности; CAD/STL выпускается вне CRM."
  };
}

export function CtPlanningImplantModelPanel({ plan, local3DReadinessPlan = null }: CtPlanningImplantModelPanelProps) {
  const local3DOperatorSummary = local3DReadinessPlan ? buildLocal3DOperatorSummary(local3DReadinessPlan) : null;

  return (
    <div className="ct-planning-implant-board" data-testid="ct-planning-implant-board" aria-label="Моделирование импланта и хирургической втулки">
      <article className={`ct-planning-implant-summary ${plan.status}`}>
        <span>Модель импланта</span>
        <strong>
          {plan.implantDiameterMm !== null && plan.implantLengthMm !== null ? `${plan.implantDiameterMm} x ${plan.implantLengthMm} мм` : "нужен размер"}
        </strong>
        <p>
          {plan.hasAxis
            ? `Апекс: ${plan.apexPointLabel}.`
            : "Выберите типоразмер и поставьте ось двумя точками."}
        </p>
        <small>{plan.modelingLabel}</small>
      </article>
      <div className="ct-planning-implant-grid">
        {plan.cards.map((card) => (
          <article className={`ct-planning-implant-card ${card.status}`} key={card.id}>
            <span>{card.title}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
            <small>{card.nextAction}</small>
          </article>
        ))}
      </div>
      {plan.warnings.length > 0 ? (
        <div className="ct-planning-implant-warnings" aria-label="Предупреждения по модели импланта">
          <span>Контроль</span>
          <p>{plan.warnings.join(" · ")}</p>
        </div>
      ) : null}
      {local3DReadinessPlan ? (
        <section
          className="ct-planning-implant-board ct-planning-local-3d-readiness"
          data-testid="ct-planning-local-3d-readiness"
          aria-label="Локальная 3D-готовность КТ-планирования"
        >
          <article className="ct-planning-implant-summary draft">
            <span>Локальный 3D-кейс</span>
            <strong>{local3DReadinessPlan.recommendedTargetLabel}</strong>
            <p>{local3DReadinessPlan.outputBoundarySummary}</p>
            <small>{local3DReadinessPlan.bridgeStatusLabel}</small>
          </article>
          <div className="ct-planning-implant-grid">
            {local3DOperatorSummary ? (
              <article
                className={`ct-planning-implant-card ${local3DOperatorSummary.status}`}
                data-testid="ct-planning-local-3d-next-action"
              >
                <span>Действие врача/лаборатории</span>
                <strong>{local3DOperatorSummary.value}</strong>
                <p>{local3DOperatorSummary.detail}</p>
                <small>{local3DOperatorSummary.nextAction}</small>
              </article>
            ) : null}
            {local3DReadinessPlan.cards.map((card) => (
              <article className={`ct-planning-implant-card ${card.status}`} key={card.id} data-local-3d-role={card.id}>
                <span>{card.title}</span>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
                <small>{card.nextAction}</small>
              </article>
            ))}
          </div>
          <div className="ct-planning-implant-warnings" aria-label="Граница локального 3D-кейса">
            <span>Метаданные</span>
            <p>{local3DReadinessPlan.warnings.length ? local3DReadinessPlan.warnings.join(" · ") : local3DReadinessPlan.nextAction}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
